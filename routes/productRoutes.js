import express from 'express';
import {
    addProduct,
    decreaseQuantity,
    deleteProduct,
    editProduct,
    getAllProducts,
    getProduct,
    getProductById
} from '../controllers/productController.js';

// middleware
import { uploadProduct } from '../middlewares/upload.js';
import isAdmin from '../middlewares/isAdmin.js';

const router = express.Router();

router.post('/', isAdmin, uploadProduct.single('images'), addProduct);

router.get('/', getAllProducts);

router.get('/filter', getProduct);

router.get('/:id', getProductById); 

router.patch('/:id', isAdmin, uploadProduct.single('images'), editProduct);

router.patch('/inventory/:product_id/:color_id/:age_range_id', isAdmin, decreaseQuantity)

router.delete('/:id', isAdmin, deleteProduct);


export default router;