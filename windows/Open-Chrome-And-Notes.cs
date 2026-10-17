using System;
using System.Configuration;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class DesktopWorkspace
{
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out NativeRect rect);
    [StructLayout(LayoutKind.Sequential)] private struct NativeRect { public int Left, Top, Right, Bottom; }

    internal static Rectangle NotesBounds(Rectangle area, double ratio)
    {
        if (Double.IsNaN(ratio) || Double.IsInfinity(ratio) || ratio < .4 || ratio > .85) ratio = .612;
        int width = Math.Max(320, (int)Math.Round(area.Width * 5.0 / 16, MidpointRounding.AwayFromZero)) + 16;
        int top = area.Top + (int)Math.Round(area.Height * ratio, MidpointRounding.AwayFromZero);
        return new Rectangle(area.Right - width, top, width, area.Bottom - top + 8);
    }

    private static Rectangle DesiredNotesBounds()
    {
        double ratio;
        if (!Double.TryParse(ConfigurationManager.AppSettings["RightPaneHeightRatio"], NumberStyles.Float, CultureInfo.InvariantCulture, out ratio)) ratio = .612;
        return NotesBounds(Screen.PrimaryScreen.WorkingArea, ratio);
    }

    private static void PositionNotes(IntPtr window)
    {
        if (window == IntPtr.Zero) throw new IOException("No pude encontrar la ventana de tus notas.");
        Rectangle bounds = DesiredNotesBounds();
        ShowWindow(window, 4);
        if (!SetWindowPos(window, IntPtr.Zero, bounds.Left, bounds.Top, bounds.Width, bounds.Height, 0x0004 | 0x0010 | 0x0040))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    }

    private static string RequiredFile(string key)
    {
        string value = ConfigurationManager.AppSettings[key];
        if (String.IsNullOrWhiteSpace(value) || !Path.IsPathRooted(value) || !File.Exists(value))
            throw new IOException("No se encuentra el archivo configurado: " + key + ".");
        return Path.GetFullPath(value);
    }

    private static IntPtr FindNotesWindow(string executable, string file)
    {
        string fileName = Path.GetFileName(file);
        foreach (Process process in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(executable)))
        {
            using (process)
            {
                try
                {
                    string title = process.MainWindowTitle.TrimStart('*').Trim();
                    if (title.Equals(fileName, StringComparison.OrdinalIgnoreCase) ||
                        title.StartsWith(fileName + " -", StringComparison.OrdinalIgnoreCase) ||
                        title.StartsWith(fileName + ":", StringComparison.OrdinalIgnoreCase)) return process.MainWindowHandle;
                }
                catch (InvalidOperationException) { }
                catch (System.ComponentModel.Win32Exception) { }
            }
        }
        return IntPtr.Zero;
    }

    private static void OpenNotes(string executable, string file)
    {
        string token;
        using (SHA256 hash = SHA256.Create())
            token = BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(file.ToLowerInvariant()))).Replace("-", "");
        using (Mutex mutex = new Mutex(false, "Local\\PropioNotes-" + token))
        {
            bool acquired = false;
            try
            {
                try { acquired = mutex.WaitOne(10000); }
                catch (AbandonedMutexException) { acquired = true; }
                if (!acquired) return;
                IntPtr existing = FindNotesWindow(executable, file);
                if (existing != IntPtr.Zero) { PositionNotes(existing); return; }
                using (Process notes = Process.Start(new ProcessStartInfo(executable, "\"" + file + "\"")
                    { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(file) }))
                {
                    if (notes != null)
                    {
                        try { notes.WaitForInputIdle(3000); }
                        catch (InvalidOperationException) { }
                    }
                }
                for (int attempt = 0; attempt < 40; attempt++)
                {
                    existing = FindNotesWindow(executable, file);
                    if (existing != IntPtr.Zero) { PositionNotes(existing); return; }
                    Thread.Sleep(100);
                }
                throw new IOException("Las notas se abrieron, pero su ventana todavía no está disponible para acomodarla.");
            }
            finally { if (acquired) mutex.ReleaseMutex(); }
        }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool verify = args.Length == 1 && args[0] == "--verify";
        bool notesOnly = args.Length == 1 && args[0] == "--notes-only";
        bool checkLayout = args.Length == 1 && args[0] == "--check-notes-layout";
        try
        {
            if (args.Length != 0 && !verify && !notesOnly && !checkLayout) return 2;
            SetProcessDPIAware();
            if (checkLayout)
            {
                IntPtr window = FindNotesWindow(RequiredFile("NotesExecutable"), RequiredFile("NotesFile"));
                NativeRect actual;
                if (window == IntPtr.Zero || !GetWindowRect(window, out actual)) return 3;
                Rectangle expected = DesiredNotesBounds();
                return Math.Abs(actual.Left - expected.Left) <= 2 && Math.Abs(actual.Top - expected.Top) <= 2 &&
                    Math.Abs(actual.Right - actual.Left - expected.Width) <= 2 && Math.Abs(actual.Bottom - actual.Top - expected.Height) <= 2 ? 0 : 3;
            }
            string chrome = RequiredFile("ChromePath");
            string chromeArguments = ConfigurationManager.AppSettings["ChromeArguments"] ?? "";
            string workingDirectory = ConfigurationManager.AppSettings["ChromeWorkingDirectory"];
            if (verify) { RequiredFile("NotesExecutable"); RequiredFile("NotesFile"); return 0; }
            string notesError = null;
            try { OpenNotes(RequiredFile("NotesExecutable"), RequiredFile("NotesFile")); }
            catch (Exception error) { notesError = error.Message; }
            if (!notesOnly) Process.Start(new ProcessStartInfo(chrome, chromeArguments)
            {
                UseShellExecute = false,
                WorkingDirectory = Directory.Exists(workingDirectory) ? workingDirectory : Path.GetDirectoryName(chrome)
            });
            if (notesError != null)
                MessageBox.Show("No pude acomodar tus notas: " + notesError, "Espacio de trabajo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return notesError == null ? 0 : 1;
        }
        catch (Exception error)
        {
            if (!verify && !checkLayout) MessageBox.Show(error.Message, "Espacio de trabajo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 1;
        }
    }
}
