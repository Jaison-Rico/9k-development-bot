import config from '../../config.js';
import mysql2 from 'mysql2/promise';

// Create connection pool
const pool = mysql2.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

class Giveaway {
  constructor(data) {
    this.id = data.id || null;
    this.guildId = data.guildId;
    this.channelId = data.channelId;
    this.messageId = data.messageId;
    this.duration = data.duration;
    this.winners = data.winners;
    this.prize = data.prize;
    this.participants = Array.isArray(data.participants) ? data.participants : JSON.parse(data.participants || '[]');
    this.ended = data.ended || false;
    this.metadata = data.metadata || null;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const connection = await pool.getConnection();
    try {
      const participantsJSON = JSON.stringify(this.participants);

      if (this.id) {
        // Update existing giveaway
        await connection.query(
          'UPDATE Giveaways SET guildId = ?, channelId = ?, messageId = ?, duration = ?, winners = ?, prize = ?, participants = ?, ended = ?, metadata = ? WHERE id = ?',
          [this.guildId, this.channelId, this.messageId, this.duration, this.winners, this.prize, participantsJSON, this.ended, this.metadata, this.id]
        );
      } else {
        // Insert new giveaway
        const [result] = await connection.query(
          'INSERT INTO Giveaways (guildId, channelId, messageId, duration, winners, prize, participants, ended, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [this.guildId, this.channelId, this.messageId, this.duration, this.winners, this.prize, participantsJSON, this.ended, this.metadata]
        );
        this.id = result.insertId;
      }
    } finally {
      connection.release();
    }
  }

  async delete() {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM Giveaways WHERE id = ?', [this.id]);
    } finally {
      connection.release();
    }
  }

  static async findOne(filter) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM Giveaways WHERE';
      const values = [];

      if (filter.messageId) {
        query += ' messageId = ?';
        values.push(filter.messageId);
      } else if (filter.id) {
        query += ' id = ?';
        values.push(filter.id);
      } else if (filter.guildId) {
        query += ' guildId = ?';
        values.push(filter.guildId);
      }

      const [rows] = await connection.query(query, values);

      if (rows.length === 0) return null;

      return new Giveaway(rows[0]);
    } finally {
      connection.release();
    }
  }

  static async find(filter = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM Giveaways WHERE 1=1';
      const values = [];

      if (filter.guildId) {
        query += ' AND guildId = ?';
        values.push(filter.guildId);
      }

      if (filter.ended !== undefined) {
        query += ' AND ended = ?';
        values.push(filter.ended ? 1 : 0);
      }

      const [rows] = await connection.query(query, values);

      return rows.map(row => new Giveaway(row));
    } finally {
      connection.release();
    }
  }

  static async deleteOne(filter) {
    const connection = await pool.getConnection();
    try {
      if (filter.messageId) {
        await connection.query('DELETE FROM Giveaways WHERE messageId = ?', [filter.messageId]);
      } else if (filter.id) {
        await connection.query('DELETE FROM Giveaways WHERE id = ?', [filter.id]);
      }
    } finally {
      connection.release();
    }
  }
}

export default Giveaway;
