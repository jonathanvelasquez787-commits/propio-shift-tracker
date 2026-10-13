// A sibling summary participates in the portal's flex/grid spacing. A native
// caption keeps it attached to the table without changing rows or portal CSS.
export function createSummaryMount(host) {
  let table = null, container = null, ownsCaption = false;
  function clear() {
    host.remove();
    if (container?.isConnected) {
      if (ownsCaption) { if (!container.childNodes.length) container.remove(); }
      else if (container.dataset.propioSummaryGroup === 'true') {
        container.replaceWith(...container.childNodes);
      }
    }
    table = null; container = null; ownsCaption = false;
  }
  function mount(nextTable) {
    if (table === nextTable && host.isConnected && container?.contains(host) &&
        (table.tagName === 'TABLE' ? container.parentElement === table : table.parentElement === container)) return;
    clear(); table = nextTable;
    for (const stale of table.querySelectorAll('#propio-summary-panel')) if (stale !== host) stale.remove();
    const document = table.ownerDocument;
    if (table.tagName === 'TABLE') {
      container = table.caption;
      ownsCaption = container?.dataset.propioSummaryCaption === 'true';
      if (!container) {
        container = document.createElement('caption'); ownsCaption = true;
        container.dataset.propioSummaryCaption = 'true';
        container.style.cssText = 'caption-side:top!important;display:table-caption!important;padding:0!important;margin:0!important;border:0!important;text-align:start!important;height:auto!important;min-height:0!important;';
        table.prepend(container);
      }
      container.prepend(host);
    } else {
      // Material's non-native tables need a single outer flow item, so the
      // portal cannot distribute space between the summary and its header.
      container = document.createElement('div'); container.dataset.propioSummaryGroup = 'true';
      container.style.cssText = 'display:block!important;padding:0!important;margin:0!important;min-width:0!important;width:100%;';
      table.before(container); container.append(host, table);
    }
  }
  return { mount, clear };
}
