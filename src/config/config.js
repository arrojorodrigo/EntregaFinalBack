import dotenv from 'dotenv'

dotenv.config()

export default {
    port: process.env.PORT,
    mongoURL: process.env.MONGO_URL,
    mongoURLTest: process.env.MONGO_URL_TEST,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    githubClientId: process.env.CLIENT_ID,
    githubClientSecret: process.env.CLIENT_SECRET,
    mailDelEcommerce: process.env.NODEMAILER_USER,
    mailPasswordDelEcommerce: process.env.NODEMAILER_PASSWORD
}