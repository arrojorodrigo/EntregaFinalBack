import { Router } from "express";
import UserModel from "../models/user.model.js";
import { deletedAccount } from '../controllers/mail.controller.js';
import { isAdmin } from '../public/js/authMiddleware.js';
import config from '../config/config.js';


const router = Router();

router.get('/', isAdmin, async (req, res) => {
    try {
        const users = await UserModel.find({}, '-_id first_name last_name email role').lean();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


router.put('/premium/:uid', isAdmin, async (req, res) => {
    const uid = req.params.uid;
    const { role } = req.body;

    // Verifica que el rol proporcionado sea válido (usuario o premium)
    if (role !== 'usuario' && role !== 'premium') {
        return res.status(400).json({ error: 'Rol no válido' });
    }

    try {
        const user = await UserModel.findOne({ _id: uid });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.status === 'active') {
            // Solo si el estado es 'active', se actualiza el rol
            user.role = role;
            await user.save();
            return res.status(200).json(user);
        } else {
            return res.status(400).json({ error: 'El usuario no tiene un estado activo.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/:uid/documents', async (req, res) => {
    const uid = req.params.uid;
    const { originalname, filename } = req.files;

    // Realiza la lógica para actualizar el usuario con el archivo subido
    try {
        const uploadedDocuments = req.files.map(file => {
            const nameWithoutExtension = file.originalname.split('.').slice(0, -1).join('.');
            return {
                name: nameWithoutExtension,
                reference: file.filename
            };
        });

        const user = await UserModel.findOne({ _id: uid });
        if (user) {
            // Guarda los documentos en el usuario
            user.documents.push(...uploadedDocuments);
            await user.save();

            // Verifica si se han cargado los documentos requeridos
            const requiredDocuments = ["Identificacion", "Comprobante de domicilio", "Comprobante de estado de cuenta"];
            const documentNames = await user.documents.map(doc => doc.name);

            const documentsMatched = requiredDocuments.every(doc => documentNames.includes(doc));

            if (documentsMatched) {
                user.status = 'active';
                await user.save();
            }
        }

        res.status(200).json({ message: 'Documentos cargados exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/', isAdmin, async (req, res) => {
    // Calcula la fecha límite (2 días atrás)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // esta linea es para probar (con solo 1 minuto atrás)
    // twoDaysAgo.setMinutes(twoDaysAgo.getMinutes() - 1);

    try {
        // Email del administrador
        const adminEmail = config.adminEmail;

        // Busca y elimina a los usuarios que no han tenido conexión en los últimos 2 días
        const usersToDelete = await UserModel.find({ last_connection: { $lt: twoDaysAgo }, email: { $ne: adminEmail } });

        // Obtener las direcciones de correo electrónico de los usuarios a eliminar
        const emailAddresses = usersToDelete.map(user => user.email);

        // Llama a la función deletedAccount para enviar notificaciones por correo electrónico
        const emailResults = await deletedAccount(emailAddresses);
        
        // Luego, elimina a los usuarios.
        const result = await UserModel.deleteMany({ last_connection: { $lt: twoDaysAgo }, email: { $ne: adminEmail } });

        if (result.deletedCount > 0) {
            // Usuarios eliminados exitosamente.
            const response = { 
                message: 'Usuarios eliminados exitosamente.',
                emailResults: emailResults
            };
            res.status(200).json(response);
        } else {
            // No se encontraron usuarios para eliminar.
            const response = { 
                error: 'No se encontraron usuarios para eliminar.'
            };
            res.status(404).json(response);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router