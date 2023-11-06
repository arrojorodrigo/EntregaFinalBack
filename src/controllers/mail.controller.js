import nodemailer from 'nodemailer'
import config from '../config/config.js';

export const getbill = async (req, res) => {
    let configMail = {
        service: 'gmail',
        auth: {
            user: config.mailDelEcommerce,
            pass: config.mailPasswordDelEcommerce
        }
    }
    let transporter = nodemailer.createTransport(configMail)

    const mailUser = req.session.user.email;
    const purchasedProducts = req.body;

   
    let purchaseDetails = '<h2>Detalle de la Compra</h2><table border="1"><tr><th>Producto</th><th>Cantidad</th><th>Precio Unitario</th></tr>';

    purchasedProducts.forEach(product => {
        purchaseDetails += `<tr>
            <td>${product.product.title}</td>
            <td>${product.quantity}</td>
            <td>${product.product.price}</td>
        </tr>`;
    });


    purchaseDetails += '</table>';


    let message = {
        from: config.mailDelEcommerce,
        to: mailUser,
        subject: 'Gracias por su compra',
        html: `
            <p>El detalle de tu compra es:</p>
            ${purchaseDetails}
        `
    };

    transporter.sendMail(message)
        .then(() => res.status(201).json({ status: 'success' }))
        .catch(error => res.status(500).json({ error }));
}

export const deletedAccount = async (emailAddresses) => {
    let configMail = {
        service: 'gmail',
        auth: {
            user: config.mailDelEcommerce,
            pass: config.mailPasswordDelEcommerce,
        },
    };
    
    let transporter = nodemailer.createTransport(configMail);

    const results = [];

    for (const email of emailAddresses) {
        let message = {
            from: config.mailDelEcommerce,
            to: email,
            subject: 'Cuenta eliminada por inactividad',
            html: 'Tu cuenta ha sido eliminada debido a la inactividad.',
        };

        try {
            await transporter.sendMail(message);
            results.push({ email, status: 'Correo electrónico enviado - Cuenta eliminada' });
        } catch (error) {
            results.push({ email, status: 'Error al enviar el correo electrónico: ' + error });
        }
    }

    return results;
};