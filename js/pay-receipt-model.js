function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}

export function payReceiptKey(start,end) { return `${start}/${end}`; }

export function validPayReceipt(record) {
  if (!record || typeof record!=='object' || Array.isArray(record)
    || typeof record.id!=='string' || !record.id.trim() || record.id.length>200
    || !validDate(record.cycleStart) || !validDate(record.cycleEnd)
    || !validDate(record.scheduledDate) || !validDate(record.date)
    || typeof record.usd!=='number' || !Number.isFinite(record.usd) || record.usd<0 || record.usd>1e9
    || typeof record.expectedAtSave!=='number' || !Number.isFinite(record.expectedAtSave) || record.expectedAtSave<0) return false;
  return Date.parse(record.cycleEnd+'T12:00:00Z')-Date.parse(record.cycleStart+'T12:00:00Z')===13*86400000;
}

export function validPayReceipts(records) {
  if (!Array.isArray(records)) return false;
  const ids=new Set(),cycles=new Set();
  for (const record of records) {
    if (!validPayReceipt(record)) return false;
    const key=payReceiptKey(record.cycleStart,record.cycleEnd);
    if (ids.has(record.id) || cycles.has(key)) return false;
    ids.add(record.id);cycles.add(key);
  }
  return true;
}

export function payReceiptFor(records,start,end) {
  return (Array.isArray(records)?records:[]).find(record=>validPayReceipt(record)&&record.cycleStart===start&&record.cycleEnd===end) || null;
}

export function payReceiptComparison(record,expected) {
  if (!validPayReceipt(record) || !Number.isFinite(expected) || expected<0) return null;
  const difference=Math.round((record.usd-expected)*100)/100;
  return {received:record.usd,expected,difference,status:difference>0?'above':difference<0?'below':'equal'};
}

export function payCycleExpected(calls,start,end,dayOf,amountOf) {
  let total=0;
  for(const call of calls) {
    const day=dayOf(call);
    if(day>=start&&day<=end){const amount=amountOf(call);if(Number.isFinite(amount)&&amount>=0)total+=amount;}
  }
  return total;
}
