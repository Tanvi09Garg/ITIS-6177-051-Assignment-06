const express = require('express');
const mariadb = require('mariadb');
const { body, validationResult } = require('express-validator');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Create a MariaDB pool
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sample',
    connectionLimit: 10,
    acquireTimeout: 30000,
    connectTimeout: 10000
});

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Order API',
      version: '1.0.0',
      description: 'API for managing orders and customers'
    },
    servers: [{ url: 'http://159.65.231.180:3000' }]
  },
  apis: ['./app.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ----------------------------------------
// API ENDPOINTS
// ----------------------------------------

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of customers
 *     responses:
 *       200:
 *         description: List of customers
 */
app.get('/users', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM customer LIMIT 10');
        res.json(rows);
    } catch (err) {
        console.error('Error acquiring connection:', err);
        res.status(500).send(err.toString());
    } finally {
        if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Retrieve a list of orders
 *     responses:
 *       200:
 *         description: List of orders
 */
app.get('/orders', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM orders');
        res.json(rows);
    } catch (err) {
        console.error('Error acquiring connection:', err);
        res.status(500).send(err.toString());
    } finally {
        if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Retrieve a single order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: A single order
 */
app.get('/orders/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM orders WHERE ord_no = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        console.error('Error acquiring connection:', err);
        res.status(500).send(err.toString());
    } finally {
        if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ord_no:
 *                 type: integer
 *               purch_amt:
 *                 type: number
 *               ord_date:
 *                 type: string
 *               customer_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 */
app.post('/orders',
  [
    body('ord_no').isNumeric().withMessage('Order number must be numeric'),
    body('purch_amt').isFloat().withMessage('Purchase amount must be a valid number'),
    body('ord_date').isISO8601().withMessage('Order date must be a valid date'),
    body('customer_id').notEmpty().withMessage('Customer ID is required')
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let conn;
    const { ord_no, purch_amt, ord_date, customer_id } = req.body;
    try {
      conn = await pool.getConnection();
      const result = await conn.query('INSERT INTO orders (ord_no, purch_amt, ord_date, customer_id) VALUES (?, ?, ?, ?)',
      [ord_no, purch_amt, ord_date, customer_id]);
      res.status(201).json({ message: 'Order created', orderId: result.insertId });
    } catch (err) {
      console.error('Error inserting order:', err);
      res.status(500).send(err.toString());
    } finally {
      if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders/{id}:
 *   patch:
 *     summary: Update part of an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purch_amt:
 *                 type: number
 *     responses:
 *       200:
 *         description: Order updated
 */
app.patch('/orders/:id',
  [
    body('purch_amt').optional().isFloat().withMessage('Purchase amount must be a valid number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let conn;
    const { purch_amt } = req.body;
    try {
      conn = await pool.getConnection();
      await conn.query('UPDATE orders SET purch_amt = ? WHERE ord_no = ?',
      [purch_amt, req.params.id]);
      res.json({ message: 'Order updated' });
    } catch (err) {
      console.error('Error updating order:', err);
      res.status(500).send(err.toString());
    } finally {
      if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Replace an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ord_no:
 *                 type: integer
 *               purch_amt:
 *                 type: number
 *               ord_date:
 *                 type: string
 *               customer_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order replaced
 */
app.put('/orders/:id',
  [
    body('ord_no').isNumeric().withMessage('Order number must be numeric'),
    body('purch_amt').isFloat().withMessage('Purchase amount must be a valid number'),
    body('ord_date').isISO8601().withMessage('Order date must be a valid date'),
    body('customer_id').notEmpty().withMessage('Customer ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let conn;
    const { ord_no, purch_amt, ord_date, customer_id } = req.body;
    try {
      conn = await pool.getConnection();
      await conn.query('UPDATE orders SET ord_no = ?, purch_amt = ?, ord_date = ?, customer_id = ? WHERE ord_no = ?',
      [ord_no, purch_amt, ord_date, customer_id, req.params.id]);
      res.json({ message: 'Order replaced' });
    } catch (err) {
      console.error('Error replacing order:', err);
      res.status(500).send(err.toString());
    } finally {
      if (conn) conn.end();
    }
});

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted
 */
app.delete('/orders/:id', async (req, res) => {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query('DELETE FROM orders WHERE ord_no = ?', [req.params.id]);
      res.json({ message: 'Order deleted' });
    } catch (err) {
      console.error('Error deleting order:', err);
      res.status(500).send(err.toString());
    } finally {
      if (conn) conn.end();
    }
});

// Fallback route for unhandled routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the Express server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://159.65.231.180:${port}`);
});
