import AuditLog from '../models/AuditLog.js';

class AuditLogController {
  static async exportLogs(req, res) {
    try {
      const filters = {
        action: req.query.action,
        admin: req.query.admin,
        severity: req.query.severity,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const csv = await AuditLog.exportToCSV(filters);
      
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Export logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export logs'
      });
    }
  }

  static async getLogs(req, res) {
    try {
      const { page = 1, limit = 50, search, ...filters } = req.query;
      
      const logs = await AuditLog.search(search, filters, parseInt(limit));
      const total = await AuditLog.countDocuments();

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch logs'
      });
    }
  }
}

export default AuditLogController;
