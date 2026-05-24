const reminderModel = require('../models/reminderModel');

class ReminderRepository {
  async getAllReminders() {
    return reminderModel.getAllReminders();
  }

  async getReminderById(id) {
    return reminderModel.getReminderById(id);
  }

  async createReminder(data, userId) {
    return reminderModel.createReminder(data, userId);
  }

  async updateReminderLastTriggered(reminderId) {
    return reminderModel.updateReminderLastTriggered(reminderId);
  }

  async updateReminderStatus(id, status) {
    return reminderModel.updateReminderStatus(id, status);
  }

  async deleteReminder(id) {
    return reminderModel.deleteReminder(id);
  }

  async getActiveReminders() {
    return reminderModel.getActiveReminders();
  }

  async updateViolationStart(id) {
    return reminderModel.updateViolationStart(id);
  }

  async resetViolationStart(id) {
    return reminderModel.resetViolationStart(id);
  }

  async resetReminderLastTriggered(id) {
    return reminderModel.resetReminderLastTriggered(id);
  }
}

module.exports = new ReminderRepository();