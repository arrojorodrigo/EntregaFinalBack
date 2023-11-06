import User from '../models/user.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { ProductService } from '../services/index.js';
import Ticket from '../models/ticket.model.js';
import logger from '../logger.js'

export const readCartsController = async (req, res) => {
  try {
    const carts = await Cart.find().lean().exec();
    res.status(200).json(carts);
  } catch (error) {
    logger.error('Error al obtener los carritos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const readCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const cart = await Cart.findById(cartId).populate('products.product').lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

     //Populate
    const productsWithInfo = await Product.populate(cart, {
      path: 'products.product',
      model: 'products',
    });

    res.status(200).json(productsWithInfo);

  } catch (error) {
    logger.error('Error al obtener los productos del carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const createCartController = async (req, res) => {
  try {
    const newCart = await Cart.create({ products: [] });

    res.status(201).json(newCart);
  } catch (error) {
    logger.error('Error al crear el carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const addProductCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productId = req.params.pid;

  
    const userId = req.session.user._id; //ID del usuario
    const user = await User.findById(userId);
    const product = await ProductService.getById(productId)

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const cart = await Cart.findById(cartId).lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    if (product.owner == user.email && user.role == 'premium'){
      res.status(404).json({ error: 'imposible agregar el producto' });
      return;
    } 

    const existingProductIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingProductIndex !== -1) {
      cart.products[existingProductIndex].quantity++;
    } else {
      cart.products.push({
        product: productId,
        quantity: 1
      });
    }

    await Cart.findByIdAndUpdate(cartId, { products: cart.products }).exec();

    await user.save();

    res.status(201).json(cart);
  } catch (error) {
    logger.error('Error al agregar producto al carrito:', error);
    res.status(500).json({ error: 'Error en el server' });
  }
}

export const updateProductsCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productsToUpdate = req.body;

    const cart = await Cart.findById(cartId).lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    await Cart.findByIdAndUpdate(cartId, { products: productsToUpdate }).exec();

    res.status(200).json({ message: 'Carrito actualizado' });
  } catch (error) {
    logger.error('Error al actualizar el carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const updateProductCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productId = req.params.pid;
    const { quantity } = req.body;

    const cart = await Cart.findById(cartId).lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    const existingProductIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingProductIndex === -1) {
      res.status(404).json({ error: 'Producto no encontrado en el carrito' });
      return;
    }

    const updatedProducts = [...cart.products];
    updatedProducts[existingProductIndex].quantity = quantity;

    await Cart.findByIdAndUpdate(cartId, { products: updatedProducts }).exec();

    res.status(200).json({ message: 'Cantidad de producto actualizada satisfactoriamente' });
  } catch (error) {
    logger.error('Error al actualizar cantidad de producto en el carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const deleteProductCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productId = req.params.pid;

    const cart = await Cart.findById(cartId).lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    cart.products = cart.products.filter((item) => item.product.toString() !== productId);

    await Cart.findByIdAndUpdate(cartId, { products: cart.products }).exec();

    res.status(200).json({ message: 'Producto eliminado del carrito satisfactoriamente' });
  } catch (error) {
    logger.error('Error al eliminar producto del carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const deleteProductsCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;

    const cart = await Cart.findById(cartId).lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    // Vaciar carrito
    cart.products = [];

    await Cart.findByIdAndUpdate(cartId, { products: cart.products }).exec();

    res.status(200).json({ message: 'Carrito vaciado satisfactoriamente' });
  } catch (error) {
    logger.error('Error al vaciar el carrito:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

export const purchaseCartController = async (req, res) => {
  try {
    const cartId = req.params.cid;

    // Obtener el carrito
    const cart = await Cart.findById(cartId).populate('products.product').lean().exec();

    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    let totalAmount = 0;
    const purchasedProducts = [];

  
    const unprocessedProducts = cart.products.filter(item => {
      const product = item.product;

      if (product.stock >= item.quantity) {
        product.stock -= item.quantity; 
        totalAmount += product.price * item.quantity; 
        purchasedProducts.push(item); 
        return false; 
      }

      return true;
    });

    if (purchasedProducts.length === 0) {
      res.status(400).json({ error: 'No se pudo procesar ninguna compra' });
      return;
    }

    await Promise.all(purchasedProducts.map(async item => {
      const product = await Product.findById(item.product._id);
      product.stock -= item.quantity;
      await product.save();
    }));

    const ticketData = {
      amount: totalAmount,
      purchaser: req.session.user.email,
    };

    const newTicket = await Ticket.create(ticketData);

  
    const user = await User.findById(req.session.user._id).populate('cart').exec();
    if (user.cart) {
      user.cart.products = unprocessedProducts;
      await user.cart.save();
    }

    res.status(200).json({
      purchasedProducts,
      unprocessedProducts,
      ticket: newTicket
    });
  } catch (error) {
    logger.error('Error al finalizar la compra:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}
