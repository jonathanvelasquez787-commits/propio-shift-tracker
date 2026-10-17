using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class DesktopWorkspace
{
    private static string RequiredFile(string key)
    {
        string value = ConfigurationManager.AppSettings[key];
        if (String.IsNullOrWhiteSpace(value) || !Path.IsPathRooted(value) || !File.Exists(value))
            throw new IOException("No se encuentra el archivo configurado: " + key + ".");
        return Path.GetFullPath(value);
    }

    private static bool NotesAreOpen(string executable, string file)
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
                        title.StartsWith(fileName + ":", StringComparison.OrdinalIgnoreCase)) return true;
                }
                catch (InvalidOperationException) { }
                catch (System.ComponentModel.Win32Exception) { }
            }
        }
        return false;
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
                if (!acquired || NotesAreOpen(executable, file)) return;
                using (Process notes = Process.Start(new ProcessStartInfo(executable, "\"" + file + "\"")
                    { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(file) }))
                {
                    if (notes != null)
                    {
                        try { notes.WaitForInputIdle(3000); }
                        catch (InvalidOperationException) { }
                    }
                }
            }
            finally { if (acquired) mutex.ReleaseMutex(); }
        }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool verify = args.Length == 1 && args[0] == "--verify";
        try
        {
            if (args.Length != 0 && !verify) return 2;
            string chrome = RequiredFile("ChromePath");
            string chromeArguments = ConfigurationManager.AppSettings["ChromeArguments"] ?? "";
            string workingDirectory = ConfigurationManager.AppSettings["ChromeWorkingDirectory"];
            if (verify) { RequiredFile("NotesExecutable"); RequiredFile("NotesFile"); return 0; }
            string notesError = null;
            try { OpenNotes(RequiredFile("NotesExecutable"), RequiredFile("NotesFile")); }
            catch (Exception error) { notesError = error.Message; }
            Process.Start(new ProcessStartInfo(chrome, chromeArguments)
            {
                UseShellExecute = false,
                WorkingDirectory = Directory.Exists(workingDirectory) ? workingDirectory : Path.GetDirectoryName(chrome)
            });
            if (notesError != null)
                MessageBox.Show("Chrome se abrió, pero no pude abrir tus notas: " + notesError, "Espacio de trabajo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return notesError == null ? 0 : 1;
        }
        catch (Exception error)
        {
            if (!verify) MessageBox.Show(error.Message, "Espacio de trabajo", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 1;
        }
    }
}
