import multer from 'multer';
import path from 'path';

// file filtering: for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        return cb(new Error('Only images (jpeg, jpg, png, webp, heic) are allowed!'), false);
    }
};

const storage = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `public/uploads/${folder}/`);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = (folder) => multer({
    storage: storage(folder),
    fileFilter
});

export const uploadProduct = upload('product');