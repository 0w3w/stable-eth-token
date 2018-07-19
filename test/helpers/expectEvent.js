const assert = require('chai').assert;

const inLogs = async (logs, eventName) => {
  const event = logs.find(e => e.event === eventName);
  assert.exists(event);
  return event;
};

const notInLogs = async (logs, eventName) => {
  const event = logs.find(e => e.event === eventName);
  assert.notExists(event);
};

const inTransaction = async (tx, eventName) => {
  const { logs } = await tx;
  return inLogs(logs, eventName);
};

const notInTransaction = async (tx, eventName) => {
  const { logs } = await tx;
  notInLogs(logs, eventName);
};

const listEvents = async (tx, eventName) => {
  const { logs } = await tx;
  let events = logs.filter(e => e.event === eventName);
  assert.isNotEmpty(events);
  return events;
}

module.exports = {
  inLogs,
  inTransaction,
  notInTransaction,
  listEvents
};