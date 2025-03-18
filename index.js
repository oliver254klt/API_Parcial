require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const { Client } = require("@notionhq/client");

const app = express();
app.use(express.json()); // Para recibir datos en formato JSON

const PORT = process.env.PORT || 3000;

// Inicializa Notion con las variables del .env
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// Ruta de prueba para ver si funciona la API
app.get('/', (req, res) => {
    res.send('¡API funcionando correctamente!');
});

// Obtener estudiantes desde Notion
app.get('/estudiantes', async (req, res) => {
    try {
        const response = await notion.databases.query({ database_id: databaseId });
        res.json(response.results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agregar estudiante en Notion
app.post('/agregar', async (req, res) => {
    try {
        const { matricula, nombre, proyecto = "", asistencia = 0, practicas = 0, parcial = 0, final = 0 } = req.body;

        if (!matricula || !nombre) {
            return res.status(400).json({ error: "Matrícula y Nombre son obligatorios." });
        }

        const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                "Matrícula": { rich_text: [{ text: { content: matricula } }] },
                "Nombre": { title: [{ text: { content: nombre } }] },
                "Proyecto": { rich_text: [{ text: { content: proyecto } }] },
                "Asistencia": { number: asistencia },
                "Practicas": { number: practicas },
                "Pr. Parcial": { number: parcial },
                "Pr. Final": { number: final }
            }
        });

        res.json({ message: 'Estudiante agregado correctamente', id: response.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Editar campo individual (asistencia, prácticas, parcial, final, matrícula)
app.patch('/editar', async (req, res) => {
    try {
        const { id, campo, valor } = req.body;
        if (!id || !campo || valor === undefined) {
            return res.status(400).json({ error: "ID, campo y valor son obligatorios." });
        }

        const propiedades = {
            "Matrícula": { rich_text: [{ text: { content: String(valor) } }] },
            "Asistencia": { number: valor },
            "Practicas": { number: valor },
            "Pr. Parcial": { number: valor },
            "Pr. Final": { number: valor }
        };

        if (!propiedades[campo]) {
            return res.status(400).json({ error: "Campo inválido." });
        }

        await notion.pages.update({
            page_id: id,
            properties: { [campo]: propiedades[campo] }
        });

        res.json({ message: `Campo ${campo} actualizado correctamente`, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un estudiante completamente
app.delete('/eliminar', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID es obligatorio." });
        }

        await notion.pages.update({
            page_id: id,
            archived: true // Notion no permite eliminar, pero sí archivar
        });

        res.json({ message: 'Estudiante eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un campo individual (asistencia, prácticas, parcial, final)
app.patch('/eliminar-campo', async (req, res) => {
    try {
        const { id, campo } = req.body;
        if (!id || !campo) {
            return res.status(400).json({ error: "ID y campo son obligatorios." });
        }

        const camposPermitidos = ["Asistencia", "Practicas", "Pr. Parcial", "Pr. Final"];
        if (!camposPermitidos.includes(campo)) {
            return res.status(400).json({ error: "Campo inválido." });
        }

        await notion.pages.update({
            page_id: id,
            properties: { [campo]: { number: 0 } } // Elimina el valor poniendo 0
        });

        res.json({ message: `Campo ${campo} eliminado correctamente`, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
