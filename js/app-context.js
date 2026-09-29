export let state = null;
export let calls = [];
export let settings = {};

export let reportsMonthlyOffset = 0;
export let calMonthOffset = 0;
export let calViewMode = 'month';
export let calYearOffset = 0;

export let scheduleEditDay = 'mon';
export let scheduleOffsetMin = 0;
export let scheduleViewMode = 'template';
export let scheduleWeekOffset = 0;

export function setAppState(value) { state = value; }
export function setAppCalls(value) { calls = value; }
export function setAppSettings(value) { settings = value; }

export function setReportsMonthlyOffset(value) { reportsMonthlyOffset = value; }
export function setCalMonthOffset(value) { calMonthOffset = value; }
export function setCalViewMode(value) { calViewMode = value; }
export function setCalYearOffset(value) { calYearOffset = value; }

export function setScheduleEditDay(value) { scheduleEditDay = value; }
export function setScheduleOffsetMin(value) { scheduleOffsetMin = value; }
export function setScheduleViewMode(value) { scheduleViewMode = value; }
export function setScheduleWeekOffset(value) { scheduleWeekOffset = value; }
