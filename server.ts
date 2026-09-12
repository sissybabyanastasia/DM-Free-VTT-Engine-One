import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Ajv from "ajv";

const ajv = new Ajv();

const characterSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 30 },
    characterClass: { 
      type: "string", 
      enum: ["Fighter", "Wizard", "Rogue", "Cleric", "Ranger", "Paladin", "Barbarian", "Bard", "Warlock", "Monk", "Druid", "Sorcerer"] 
    },
    level: { type: "integer", minimum: 1, maximum: 20 },
    abilities: {
      type: "object",
      properties: {
        strength: { type: "integer", minimum: 1, maximum: 30 },
        dexterity: { type: "integer", minimum: 1, maximum: 30 },
        constitution: { type: "integer", minimum: 1, maximum: 30 },
        intelligence: { type: "integer", minimum: 1, maximum: 30 },
        wisdom: { type: "integer", minimum: 1, maximum: 30 },
        charisma: { type: "integer", minimum: 1, maximum: 30 },
      },
      required: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
    }
  },
  required: ["name", "characterClass", "level", "abilities"],
  additionalProperties: true
};

const validateCharacter = ajv.compile(characterSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints MUST be defined before Vite middleware
  app.post("/api/characters/import", (req, res) => {
    const data = req.body;
    
    const valid = validateCharacter(data);
    if (!valid) {
      return res.status(400).json({ 
        success: false, 
        errors: validateCharacter.errors 
      });
    }

    // Return the validated data so the frontend can save it to Firebase
    res.json({ success: true, data });
  });

  app.get("/api/characters/template", (req, res) => {
    const template = {
      name: "Thorin Oakenshield",
      characterClass: "Fighter",
      level: 1,
      abilities: {
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 13
      }
    };
    res.json(template);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
