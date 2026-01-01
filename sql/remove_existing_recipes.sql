-- SQL Script to Remove Existing Recipe Data
-- Restaurant POS System - Indian Recipe Database Migration
-- Created: 2026-01-01

-- First, check if we have any existing data
SELECT 
    'recipes' as table_name,
    COUNT(*) as record_count
FROM recipes
UNION ALL
SELECT 
    'recipe_ingredients' as table_name,
    COUNT(*) as record_count
FROM recipe_ingredients;

-- Remove all existing recipe data (foreign key constraints will handle ingredients)
DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes);
DELETE FROM recipes;

-- Verify deletion
SELECT 
    'recipes' as table_name,
    COUNT(*) as record_count_after_deletion
FROM recipes
UNION ALL
SELECT 
    'recipe_ingredients' as table_name,
    COUNT(*) as record_count_after_deletion
FROM recipe_ingredients;

-- Reset any sequences if needed
-- Note: PostgreSQL automatically handles UUID generation, but if using SERIAL, uncomment:
-- SELECT setval('recipes_id_seq', 1, false);
-- SELECT setval('recipe_ingredients_id_seq', 1, false);

-- Create indexes for better performance (if not already created by schema)
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant_id ON recipes(tenant_id);

-- Verify indexes exist
SELECT 
    tablename,
    indexname,
    columnname
FROM pg_indexes 
WHERE tablename IN ('recipes', 'recipe_ingredients')
ORDER BY tablename, indexname;