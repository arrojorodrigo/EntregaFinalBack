import logger from '../logger.js'
import UserModel from '../models/user.model.js'

export const viewsUserRegisterController = (req, res) => {
    if (req.session.user) {
        
        res.redirect('/profile');
    } else {
        res.render('register');
    }
}

export const viewsUserLoginController = (req, res) => {
    if (req.session.user) {
       
        res.redirect('/products');
    } else {
        res.render('login');
    }
}

export const viewsUserProfileController = (req, res) => {
    
    const userInfo = {
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name,
        email: req.session.user.email,
        age: req.session.user.age,
        cart: req.session.user.cart,
    };
    logger.debug('UserInfo:', userInfo);
    res.render('profile', userInfo);
}

export const viewsUserLogoutController = async (req, res) => {
    if (req.session.user) {
        try {
            
            const userId = req.session.user._id;
            const user = await UserModel.findById(userId);

            if (user) {
            
                user.last_connection = new Date();
                await user.save();
            }
        } catch (error) {
            logger.error(error.message);
        }
    }

    req.session.destroy((err) => {
        if (err) {
            logger.error(err.message);
        }
        res.redirect('/login');
    });
}

export const viewsUserForgetPasswordController = (req, res) => {

    res.render('forget-password');
}


