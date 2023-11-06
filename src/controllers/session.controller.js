import passport from 'passport';
import Cart from '../models/cart.model.js'
import UserDTO from '../dto/User.js'
import logger from '../logger.js'

export const createUserController = async (req, res, next) => {
  passport.authenticate('register', async (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to register' });
    } 
    if (!user) {
      return res.status(400).json({ error: 'Failed to register' });
    } 
    try {
      
      const newCart = await Cart.create({ products: [] });

      user.cart = newCart._id;
      await user.save();

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ message: 'Registration and login successful' });
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to registerr' });
    }
  })(req, res, next);
}

export const failCreateUserController = (req, res) => {
  res.send({ error: 'Failed to register' })
}

export const loginUserController = async (req, res) => {
  req.session.user = req.user;
  res.status(200).json({ message: 'Login successful' });
}
export const errorLoginUserController = (err) => {
  logger.error("Error en la autenticación:", err);
  res.status(500).send({ error: 'Error de servidor' });
}

export const failLoginUserController = (req, res) => {
  res.send({ error: 'Failed to login' })
}

export const githubLoginUserController = async (req, res) => {

}

export const githubCallbackLoginUserController = async (req, res) => {
  logger.debug('Callback: ', req.user)
  req.session.user = req.user;
  logger.debug('User session: ', req.session.user)
  res.redirect('/');
}

export const readInfoUserController = (req, res) => {
  if (req.isAuthenticated()) {
    const user = {
      _id: req.user._id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      email: req.user.email,
      age: req.user.age,
      cart: req.user.cart,
      role: req.user.role
    };


    const result = new UserDTO(user);
    logger.debug('User: ', result)
    res.status(200).json(result);
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

