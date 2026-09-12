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

  // Solo Module Clearance & Settlement Engine:
  // Enforces "Death = Zero Returns" backend rule.
  app.post("/api/module/settle", (req, res) => {
    const { moduleId, heroSurvives, bossKilled, currentGold = 120, startingGold = 120, loot = [] } = req.body;

    if (!heroSurvives) {
      return res.json({
        settled: false,
        rule: "death_equals_zero_returns",
        message: "DEATH = ZERO RETURNS: The hero fell before conquering the Crucible. All expedition loot and bonus gold are forfeited to the dungeon.",
        forfeitedGold: Math.max(0, currentGold - startingGold),
        forfeitedItemsCount: loot.length,
        settledGold: startingGold,
        voucherIssued: false
      });
    }

    if (!bossKilled) {
      return res.json({
        settled: false,
        message: "Expedition incomplete: General Vaelok has not been vanquished.",
        voucherIssued: false
      });
    }

    // Clearance verified! Issue official settlement voucher
    const voucher = {
      id: "voucher_robe_of_conquest_red",
      name: "Voucher: Robe of Conquest-Red",
      issuedAt: new Date().toISOString(),
      moduleId: moduleId || "module_4_solo_crucible",
      settlementBountyGold: 350,
      description: "Official voucher of conquest. Redeem at the Town Shop for the Robe of Conquest-Red (+10% damage dealt, rounded down)."
    };

    res.json({
      settled: true,
      message: "CRUCIBLE CONQUERED: Official clearance verified! Expedition loot secured and voucher granted.",
      settledGold: currentGold + 350,
      voucher,
      voucherIssued: true
    });
  });

  // Damage calculation endpoint for Robe of Conquest-Red (+10% rounded down)
  app.post("/api/items/calculate-damage", (req, res) => {
    const { baseDamage = 0, hasRobeOfConquest = false } = req.body;
    const bonus = hasRobeOfConquest ? Math.floor(baseDamage * 0.10) : 0;
    const finalDamage = baseDamage + bonus;

    res.json({
      baseDamage,
      bonus,
      finalDamage,
      multiplierFormula: "baseDamage + Math.floor(baseDamage * 0.10)"
    });
  });

  // Voucher redemption endpoint
  app.post("/api/voucher/redeem", (req, res) => {
    const { voucherId } = req.body;
    if (voucherId !== "voucher_robe_of_conquest_red") {
      return res.status(400).json({ success: false, message: "Invalid or unrecognized voucher." });
    }

    res.json({
      success: true,
      item: {
        id: "robe_of_conquest_red",
        name: "Robe of Conquest-Red",
        category: "armor",
        rarity: "legendary",
        description: "All damage dealt +10%, rounded down to nearest whole number.",
        effect: "damage_multiplier_1_10"
      }
    });
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
