const validatePrice = async (req, res, next) => {
    const {price} = req.body;

    if (price && price < 0 && !isNaN(price) && !isNaN(parseFloat(price))) {
        return res.status(400).json({error: 'price must be a positive decimal number.'})
    }

    next();
}

export default validatePrice;