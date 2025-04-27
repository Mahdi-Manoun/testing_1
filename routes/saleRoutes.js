import express from 'express';
import { createSale, getAllSales } from '../controllers/saleController.js';
// import isAdmin from '../middlewares/isAdmin.js';

const router = express.Router();

router.post('/', createSale);

// router.get('/', isAdmin, getAllSales);


export default router;