import express from 'express'
import { Server } from 'socket.io'
import handlebars from 'express-handlebars'
import productsRouter from './routers/products.router.js'
import cartsRouter from './routers/carts.router.js'
import viewsRouter from './routers/views.router.js'
import chatRouter from './routers/chat.router.js'
import sessionsRouter from './routers/sessions.router.js'
import viewsUserRouter from './routers/viewsUser.router.js'
import mailPurchaseRouter from './routers/mailPurchase.router.js'
import mockingRouter from './routers/mocking.router.js'
import loggerTestRouter from './routers/logger.router.js'
import apiUsersRouter from './routers/apiUsers.router.js'
import paymentsRouter from './routers/payments.router.js'
import mongoose from 'mongoose'
import Message from './models/message.model.js'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import initializePassport from './config/passport.config.js'
import config from './config/config.js'
import errorHandler from './middlewares/error.middleware.js'
import logger from './logger.js'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUiExpress from 'swagger-ui-express'
import multer from 'multer'

const port = config.port
const mongoURL = config.mongoURL
const mongoDBName = config.mongoDBName


const app = express(); 

app.use(express.json());

app.use(errorHandler)
app.use(express.static('./src/public')); 
app.use(express.urlencoded({ extended: true }))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const { type } = req.body;
      if (type === 'profile') {
          cb(null, 'src/public/uploads/profiles');
      } else if (type === 'product') {
          cb(null, 'src/public/uploads/products');
      } else if (type === 'document') {
          cb(null, 'src/public/uploads/documents');
      } else {
          cb(null, 'src/public/uploads/other');
      }
  },
  filename: (req, file, cb) => {
      cb(null, file.originalname);
  },
});

const upload = multer({ storage });


app.use(session({
  store: MongoStore.create({
    mongoUrl: mongoURL,
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }),
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}))

initializePassport();
app.use(passport.initialize());
app.use(passport.session());

app.engine('handlebars', handlebars.engine());
app.set('views', './src/views');
app.set('view engine', 'handlebars');

try {
  await mongoose.connect(mongoURL) 
  const serverHttp = app.listen(port, () => logger.info('seven up')) 
  const io = new Server(serverHttp) 
  
  app.use((req, res, next) => {
    req.io = io;
    next();
  }); 
  
  ///// Rutas /////
  app.get('/', (req, res) => {
    if (req.session.user) {
      
      res.render('index');
    } else {
      
      res.redirect('/login');
    }
  })
  
  const swaggerOptions = {
    definition: {
      openapi: '3.0.1',
      info: {
        title: 'Documentacion API',
        description: 'descripción'
      }
    },
    apis: ['./docs/**/*.yaml']
  };
  
  const specs = swaggerJSDoc(swaggerOptions)
  app.use('/docs',swaggerUiExpress.serve, swaggerUiExpress.setup(specs))


  app.use('/', viewsUserRouter); 
  app.use('/chat', chatRouter); 
  app.use('/products', viewsRouter); 
  app.use('/mockingproducts', mockingRouter); 
  app.use('/api/users', upload.array('files', 20), apiUsersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/carts', cartsRouter); 
  app.use('/api/sessions', sessionsRouter);
  app.use('/sendMailPurchase', mailPurchaseRouter); 
  app.use('/loggerTest', loggerTestRouter); 
  app.use('/payments', paymentsRouter); 

  io.on('connection', socket => {
    logger.info('Nuevo cliente conectado!')

    socket.broadcast.emit('Alerta');

    Message.find()
      .then(messages => {
        socket.emit('messages', messages);
      })
      .catch(error => {
        logger.error(error.message);
      });

    socket.on('message', data => {
      
      const newMessage = new Message({
        user: data.user,
        message: data.message
      });

      newMessage.save()
        .then(() => {
          
          Message.find()
            .then(messages => {
              io.emit('messages', messages);
            })
            .catch(error => {
              logger.error(error.message);
            });
        })
        .catch(error => {
          logger.error(error.message);
        });
    });

    socket.on('productList', async (data) => {
      io.emit('updatedProducts', data) 
    }) 
  }) 
} catch (error) {
  logger.error(error.message)
}
