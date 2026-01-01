-- SQL Script to Insert Recipe Ingredients for Indian Recipes
-- Restaurant POS System - Complete Recipe Database
-- Created: 2026-01-01
-- This script adds ingredients for the recipes created in insert_indian_recipes.sql

-- Note: This script assumes the recipes have been inserted and have UUIDs
-- For demonstration, we'll use placeholder recipe IDs. In production, you would
-- need to get the actual recipe IDs from the inserted recipes.

-- ================================================================================
-- RECIPE INGREDIENTS FOR STARTERS & APPETIZERS
-- ================================================================================

-- Paneer Tikka Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Paneer Tikka' AND category = 'Starters & Appetizers'), 'Paneer', 500, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Paneer Tikka' AND category = 'Starters & Appetizers'), 'Yogurt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Paneer Tikka' AND category = 'Starters & Appetizers'), 'Red chili powder', 10, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Paneer Tikka' AND category = 'Starters & Appetizers'), 'Garam masala', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Paneer Tikka' AND category = 'Starters & Appetizers'), 'Lemon juice', 20, 'ml', 0.02, NULL);

-- Chicken Tikka Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Chicken Tikka' AND category = 'Starters & Appetizers'), 'Chicken breast', 500, 'g', 0.04, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka' AND category = 'Starters & Appetizers'), 'Yogurt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka' AND category = 'Starters & Appetizers'), 'Ginger garlic paste', 20, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka' AND category = 'Starters & Appetizers'), 'Red chili powder', 10, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka' AND category = 'Starters & Appetizers'), 'Lemon juice', 20, 'ml', 0.02, NULL);

-- Aloo Tikki Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Aloo Tikki' AND category = 'Starters & Appetizers'), 'Potatoes', 500, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Tikki' AND category = 'Starters & Appetizers'), 'Green peas', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Tikki' AND category = 'Starters & Appetizers'), 'Ginger garlic paste', 10, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Tikki' AND category = 'Starters & Appetizers'), 'Coriander powder', 5, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Tikki' AND category = 'Starters & Appetizers'), 'Oil for frying', 50, 'ml', 0.02, NULL);

-- Samosa Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Samosa' AND category = 'Starters & Appetizers'), 'All purpose flour', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Samosa' AND category = 'Starters & Appetizers'), 'Potatoes', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Samosa' AND category = 'Starters & Appetizers'), 'Green peas', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Samosa' AND category = 'Starters & Appetizers'), 'Cumin seeds', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Samosa' AND category = 'Starters & Appetizers'), 'Oil for frying', 100, 'ml', 0.02, NULL);

-- Dahi Puri Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Dahi Puri' AND category = 'Starters & Appetizers'), 'Puri', 20, 'pcs', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Dahi Puri' AND category = 'Starters & Appetizers'), 'Potatoes', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Dahi Puri' AND category = 'Starters & Appetizers'), 'Yogurt', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Dahi Puri' AND category = 'Starters & Appetizers'), 'Tamarind chutney', 50, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dahi Puri' AND category = 'Starters & Appetizers'), 'Sev', 50, 'g', 0.02, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR MAIN COURSE - VEGETARIAN
-- ================================================================================

-- Palak Paneer Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Palak Paneer' AND category = 'Main Course - Vegetarian'), 'Spinach', 500, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Palak Paneer' AND category = 'Main Course - Vegetarian'), 'Paneer', 250, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Palak Paneer' AND category = 'Main Course - Vegetarian'), 'Onion', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Palak Paneer' AND category = 'Main Course - Vegetarian'), 'Tomato', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Palak Paneer' AND category = 'Main Course - Vegetarian'), 'Cream', 50, 'ml', 0.02, NULL);

-- Chana Masala Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Chana Masala' AND category = 'Main Course - Vegetarian'), 'Chickpeas', 200, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Chana Masala' AND category = 'Main Course - Vegetarian'), 'Onion', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chana Masala' AND category = 'Main Course - Vegetarian'), 'Tomato', 150, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chana Masala' AND category = 'Main Course - Vegetarian'), 'Ginger garlic paste', 20, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Chana Masala' AND category = 'Main Course - Vegetarian'), 'Chana masala', 15, 'g', 0.05, NULL);

-- Dal Makhani Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Dal Makhani' AND category = 'Main Course - Vegetarian'), 'Black lentils', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dal Makhani' AND category = 'Main Course - Vegetarian'), 'Kidney beans', 50, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Dal Makhani' AND category = 'Main Course - Vegetarian'), 'Butter', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dal Makhani' AND category = 'Main Course - Vegetarian'), 'Cream', 50, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dal Makhani' AND category = 'Main Course - Vegetarian'), 'Kasuri methi', 5, 'g', 0.20, NULL);

-- Aloo Gobi Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Aloo Gobi' AND category = 'Main Course - Vegetarian'), 'Potatoes', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Gobi' AND category = 'Main Course - Vegetarian'), 'Cauliflower', 400, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Gobi' AND category = 'Main Course - Vegetarian'), 'Onion', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Gobi' AND category = 'Main Course - Vegetarian'), 'Tomato', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Aloo Gobi' AND category = 'Main Course - Vegetarian'), 'Ginger garlic paste', 15, 'g', 0.02, NULL);

-- Malai Kofta Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Malai Kofta' AND category = 'Main Course - Vegetarian'), 'Potatoes', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Malai Kofta' AND category = 'Main Course - Vegetarian'), 'Paneer', 200, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Malai Kofta' AND category = 'Main Course - Vegetarian'), 'Mixed vegetables', 150, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Malai Kofta' AND category = 'Main Course - Vegetarian'), 'Cream', 100, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Malai Kofta' AND category = 'Main Course - Vegetarian'), 'Cashew paste', 50, 'g', 0.10, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR MAIN COURSE - NON-VEGETARIAN
-- ================================================================================

-- Butter Chicken Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Butter Chicken' AND category = 'Main Course - Non-Vegetarian'), 'Chicken', 500, 'g', 0.04, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Chicken' AND category = 'Main Course - Non-Vegetarian'), 'Butter', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Chicken' AND category = 'Main Course - Non-Vegetarian'), 'Cream', 100, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Chicken' AND category = 'Main Course - Non-Vegetarian'), 'Tomato puree', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Chicken' AND category = 'Main Course - Non-Vegetarian'), 'Ginger garlic paste', 20, 'g', 0.02, NULL);

-- Chicken Tikka Masala Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Chicken Tikka Masala' AND category = 'Main Course - Non-Vegetarian'), 'Chicken', 500, 'g', 0.04, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka Masala' AND category = 'Main Course - Non-Vegetarian'), 'Yogurt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka Masala' AND category = 'Main Course - Non-Vegetarian'), 'Tomato puree', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka Masala' AND category = 'Main Course - Non-Vegetarian'), 'Cream', 100, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Tikka Masala' AND category = 'Main Course - Non-Vegetarian'), 'Garam masala', 10, 'g', 0.10, NULL);

-- Rogan Josh Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Rogan Josh' AND category = 'Main Course - Non-Vegetarian'), 'Mutton', 500, 'g', 0.06, NULL),
((SELECT id FROM recipes WHERE name = 'Rogan Josh' AND category = 'Main Course - Non-Vegetarian'), 'Yogurt', 150, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Rogan Josh' AND category = 'Main Course - Non-Vegetarian'), 'Kashmiri red chili', 15, 'g', 0.08, NULL),
((SELECT id FROM recipes WHERE name = 'Rogan Josh' AND category = 'Main Course - Non-Vegetarian'), 'Ginger powder', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Rogan Josh' AND category = 'Main Course - Non-Vegetarian'), 'Fennel seeds', 10, 'g', 0.05, NULL);

-- Fish Curry Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Fish Curry' AND category = 'Main Course - Non-Vegetarian'), 'Fish', 500, 'g', 0.08, NULL),
((SELECT id FROM recipes WHERE name = 'Fish Curry' AND category = 'Main Course - Non-Vegetarian'), 'Coconut milk', 200, 'ml', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Fish Curry' AND category = 'Main Course - Non-Vegetarian'), 'Tamarind paste', 20, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Fish Curry' AND category = 'Main Course - Non-Vegetarian'), 'Mustard seeds', 5, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Fish Curry' AND category = 'Main Course - Non-Vegetarian'), 'Curry leaves', 10, 'g', 0.10, NULL);

-- Chicken Biryani Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Main Course - Non-Vegetarian'), 'Chicken', 500, 'g', 0.04, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Main Course - Non-Vegetarian'), 'Basmati rice', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Main Course - Non-Vegetarian'), 'Onion', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Main Course - Non-Vegetarian'), 'Yogurt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Main Course - Non-Vegetarian'), 'Saffron', 1, 'g', 5.00, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR BREADS & ROTIS
-- ================================================================================

-- Naan Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Naan' AND category = 'Breads & Rotis'), 'All purpose flour', 250, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Naan' AND category = 'Breads & Rotis'), 'Yeast', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Naan' AND category = 'Breads & Rotis'), 'Milk', 100, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Naan' AND category = 'Breads & Rotis'), 'Sugar', 10, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Naan' AND category = 'Breads & Rotis'), 'Butter', 20, 'g', 0.02, NULL);

-- Roti Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Roti' AND category = 'Breads & Rotis'), 'Whole wheat flour', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Roti' AND category = 'Breads & Rotis'), 'Water', 100, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Roti' AND category = 'Breads & Rotis'), 'Salt', 2, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Roti' AND category = 'Breads & Rotis'), 'Ghee', 10, 'g', 0.02, NULL);

-- Paratha Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Paratha' AND category = 'Breads & Rotis'), 'Whole wheat flour', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Paratha' AND category = 'Breads & Rotis'), 'Ghee', 30, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Paratha' AND category = 'Breads & Rotis'), 'Water', 100, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Paratha' AND category = 'Breads & Rotis'), 'Salt', 2, 'g', 0.01, NULL);

-- Butter Naan Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Butter Naan' AND category = 'Breads & Rotis'), 'All purpose flour', 250, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Naan' AND category = 'Breads & Rotis'), 'Yeast', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Naan' AND category = 'Breads & Rotis'), 'Milk', 100, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Naan' AND category = 'Breads & Rotis'), 'Butter', 30, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Butter Naan' AND category = 'Breads & Rotis'), 'Sugar', 10, 'g', 0.01, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR RICE & BIRYANI
-- ================================================================================

-- Steamed Basmati Rice Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Steamed Basmati Rice' AND category = 'Rice & Biryani'), 'Basmati rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Steamed Basmati Rice' AND category = 'Rice & Biryani'), 'Water', 400, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Steamed Basmati Rice' AND category = 'Rice & Biryani'), 'Salt', 5, 'g', 0.01, NULL);

-- Jeera Rice Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Jeera Rice' AND category = 'Rice & Biryani'), 'Basmati rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Jeera Rice' AND category = 'Rice & Biryani'), 'Cumin seeds', 10, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Jeera Rice' AND category = 'Rice & Biryani'), 'Ghee', 20, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Jeera Rice' AND category = 'Rice & Biryani'), 'Water', 400, 'ml', 0.00, NULL);

-- Veg Pulao Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Veg Pulao' AND category = 'Rice & Biryani'), 'Basmati rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Veg Pulao' AND category = 'Rice & Biryani'), 'Mixed vegetables', 150, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Veg Pulao' AND category = 'Rice & Biryani'), 'Cumin seeds', 5, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Veg Pulao' AND category = 'Rice & Biryani'), 'Ghee', 20, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Veg Pulao' AND category = 'Rice & Biryani'), 'Whole spices', 10, 'g', 0.05, NULL);

-- Chicken Biryani Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Rice & Biryani'), 'Basmati rice', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Rice & Biryani'), 'Chicken', 500, 'g', 0.04, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Rice & Biryani'), 'Yogurt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Rice & Biryani'), 'Saffron', 1, 'g', 5.00, NULL),
((SELECT id FROM recipes WHERE name = 'Chicken Biryani' AND category = 'Rice & Biryani'), 'Ghee', 50, 'g', 0.02, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR SNACKS & STREET FOOD
-- ================================================================================

-- Vada Pav Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Vada Pav' AND category = 'Snacks & Street Food'), 'Potatoes', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Vada Pav' AND category = 'Snacks & Street Food'), 'Besan', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Vada Pav' AND category = 'Snacks & Street Food'), 'Pav buns', 4, 'pcs', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Vada Pav' AND category = 'Snacks & Street Food'), 'Green chutney', 50, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Vada Pav' AND category = 'Snacks & Street Food'), 'Oil for frying', 100, 'ml', 0.02, NULL);

-- Pav Bhaji Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Pav Bhaji' AND category = 'Snacks & Street Food'), 'Mixed vegetables', 500, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Pav Bhaji' AND category = 'Snacks & Street Food'), 'Pav buns', 8, 'pcs', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Pav Bhaji' AND category = 'Snacks & Street Food'), 'Butter', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Pav Bhaji' AND category = 'Snacks & Street Food'), 'Pav bhaji masala', 20, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Pav Bhaji' AND category = 'Snacks & Street Food'), 'Onion', 100, 'g', 0.01, NULL);

-- Dosa Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Dosa' AND category = 'Snacks & Street Food'), 'Rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa' AND category = 'Snacks & Street Food'), 'Urad dal', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa' AND category = 'Snacks & Street Food'), 'Water', 300, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa' AND category = 'Snacks & Street Food'), 'Salt', 5, 'g', 0.01, NULL);

-- Idli Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Idli' AND category = 'Snacks & Street Food'), 'Rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Idli' AND category = 'Snacks & Street Food'), 'Urad dal', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Idli' AND category = 'Snacks & Street Food'), 'Water', 300, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Idli' AND category = 'Snacks & Street Food'), 'Salt', 5, 'g', 0.01, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR CHUTNEYS & DIPS
-- ================================================================================

-- Mint Chutney Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Mint Chutney' AND category = 'Chutneys & Dips'), 'Mint leaves', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Mint Chutney' AND category = 'Chutneys & Dips'), 'Green chilies', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Mint Chutney' AND category = 'Chutneys & Dips'), 'Lemon juice', 20, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Mint Chutney' AND category = 'Chutneys & Dips'), 'Salt', 2, 'g', 0.01, NULL);

-- Coriander Chutney Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Coriander Chutney' AND category = 'Chutneys & Dips'), 'Coriander leaves', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Coriander Chutney' AND category = 'Chutneys & Dips'), 'Green chilies', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Coriander Chutney' AND category = 'Chutneys & Dips'), 'Lemon juice', 20, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Coriander Chutney' AND category = 'Chutneys & Dips'), 'Salt', 2, 'g', 0.01, NULL);

-- Tamarind Chutney Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Tamarind Chutney' AND category = 'Chutneys & Dips'), 'Tamarind', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Tamarind Chutney' AND category = 'Chutneys & Dips'), 'Jaggery', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Tamarind Chutney' AND category = 'Chutneys & Dips'), 'Cumin powder', 5, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Tamarind Chutney' AND category = 'Chutneys & Dips'), 'Red chili powder', 5, 'g', 0.05, NULL);

-- Coconut Chutney Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Coconut Chutney' AND category = 'Chutneys & Dips'), 'Coconut', 100, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Coconut Chutney' AND category = 'Chutneys & Dips'), 'Roasted chana dal', 20, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Coconut Chutney' AND category = 'Chutneys & Dips'), 'Green chilies', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Coconut Chutney' AND category = 'Chutneys & Dips'), 'Mustard seeds', 5, 'g', 0.05, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR DESSERTS & SWEETS
-- ================================================================================

-- Gulab Jamun Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Gulab Jamun' AND category = 'Desserts & Sweets'), 'Khoya', 200, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Gulab Jamun' AND category = 'Desserts & Sweets'), 'All purpose flour', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Gulab Jamun' AND category = 'Desserts & Sweets'), 'Sugar', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Gulab Jamun' AND category = 'Desserts & Sweets'), 'Cardamom powder', 5, 'g', 0.20, NULL),
((SELECT id FROM recipes WHERE name = 'Gulab Jamun' AND category = 'Desserts & Sweets'), 'Oil for frying', 100, 'ml', 0.02, NULL);

-- Rasgulla Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Rasgulla' AND category = 'Desserts & Sweets'), 'Milk', 500, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Rasgulla' AND category = 'Desserts & Sweets'), 'Lemon juice', 20, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Rasgulla' AND category = 'Desserts & Sweets'), 'Sugar', 250, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Rasgulla' AND category = 'Desserts & Sweets'), 'Cardamom powder', 5, 'g', 0.20, NULL);

-- Kheer Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Kheer' AND category = 'Desserts & Sweets'), 'Rice', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Kheer' AND category = 'Desserts & Sweets'), 'Milk', 500, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Kheer' AND category = 'Desserts & Sweets'), 'Sugar', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Kheer' AND category = 'Desserts & Sweets'), 'Cardamom powder', 5, 'g', 0.20, NULL),
((SELECT id FROM recipes WHERE name = 'Kheer' AND category = 'Desserts & Sweets'), 'Almonds', 20, 'g', 0.10, NULL);

-- Gajar ka Halwa Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Gajar ka Halwa' AND category = 'Desserts & Sweets'), 'Carrots', 300, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Gajar ka Halwa' AND category = 'Desserts & Sweets'), 'Milk', 250, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Gajar ka Halwa' AND category = 'Desserts & Sweets'), 'Sugar', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Gajar ka Halwa' AND category = 'Desserts & Sweets'), 'Ghee', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Gajar ka Halwa' AND category = 'Desserts & Sweets'), 'Almonds', 30, 'g', 0.10, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR BEVERAGES
-- ================================================================================

-- Masala Chai Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Masala Chai' AND category = 'Beverages'), 'Tea leaves', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Masala Chai' AND category = 'Beverages'), 'Milk', 100, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Masala Chai' AND category = 'Beverages'), 'Water', 100, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Masala Chai' AND category = 'Beverages'), 'Sugar', 20, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Masala Chai' AND category = 'Beverages'), 'Cardamom', 2, 'g', 0.10, NULL);

-- Nimbu Pani Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Nimbu Pani' AND category = 'Beverages'), 'Lemons', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Nimbu Pani' AND category = 'Beverages'), 'Water', 500, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Nimbu Pani' AND category = 'Beverages'), 'Sugar', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Nimbu Pani' AND category = 'Beverages'), 'Salt', 2, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Nimbu Pani' AND category = 'Beverages'), 'Mint leaves', 5, 'g', 0.02, NULL);

-- Lassi Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Lassi' AND category = 'Beverages'), 'Yogurt', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Lassi' AND category = 'Beverages'), 'Water', 200, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Lassi' AND category = 'Beverages'), 'Sugar', 30, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Lassi' AND category = 'Beverages'), 'Cardamom powder', 2, 'g', 0.20, NULL);

-- Mango Lassi Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Mango Lassi' AND category = 'Beverages'), 'Mango pulp', 100, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Lassi' AND category = 'Beverages'), 'Yogurt', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Lassi' AND category = 'Beverages'), 'Milk', 100, 'ml', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Lassi' AND category = 'Beverages'), 'Sugar', 30, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Lassi' AND category = 'Beverages'), 'Cardamom powder', 2, 'g', 0.20, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR PICKLES & CONDIMENTS
-- ================================================================================

-- Mango Pickle Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Mango Pickle' AND category = 'Pickles & Condiments'), 'Raw mango', 500, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Pickle' AND category = 'Pickles & Condiments'), 'Salt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Pickle' AND category = 'Pickles & Condiments'), 'Mustard seeds', 20, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Pickle' AND category = 'Pickles & Condiments'), 'Red chili powder', 30, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Mango Pickle' AND category = 'Pickles & Condiments'), 'Mustard oil', 100, 'ml', 0.02, NULL);

-- Lemon Pickle Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Lemon Pickle' AND category = 'Pickles & Condiments'), 'Lemons', 500, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Lemon Pickle' AND category = 'Pickles & Condiments'), 'Salt', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Lemon Pickle' AND category = 'Pickles & Condiments'), 'Mustard seeds', 20, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Lemon Pickle' AND category = 'Pickles & Condiments'), 'Red chili powder', 30, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Lemon Pickle' AND category = 'Pickles & Condiments'), 'Mustard oil', 100, 'ml', 0.02, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR REGIONAL SPECIALTIES
-- ================================================================================

-- Dosa Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Dosa (South Indian)' AND category = 'Regional Specialties'), 'Rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa (South Indian)' AND category = 'Regional Specialties'), 'Urad dal', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa (South Indian)' AND category = 'Regional Specialties'), 'Water', 300, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Dosa (South Indian)' AND category = 'Regional Specialties'), 'Salt', 5, 'g', 0.01, NULL);

-- Idli Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Idli (South Indian)' AND category = 'Regional Specialties'), 'Rice', 200, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Idli (South Indian)' AND category = 'Regional Specialties'), 'Urad dal', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Idli (South Indian)' AND category = 'Regional Specialties'), 'Water', 300, 'ml', 0.00, NULL),
((SELECT id FROM recipes WHERE name = 'Idli (South Indian)' AND category = 'Regional Specialties'), 'Salt', 5, 'g', 0.01, NULL);

-- Pongal Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Pongal (South Indian)' AND category = 'Regional Specialties'), 'Rice', 100, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Pongal (South Indian)' AND category = 'Regional Specialties'), 'Moong dal', 50, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Pongal (South Indian)' AND category = 'Regional Specialties'), 'Ghee', 30, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Pongal (South Indian)' AND category = 'Regional Specialties'), 'Cashew nuts', 20, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Pongal (South Indian)' AND category = 'Regional Specialties'), 'Black pepper', 5, 'g', 0.10, NULL);

-- ================================================================================
-- RECIPE INGREDIENTS FOR HEALTH & WELLNESS
-- ================================================================================

-- Sprouts Salad Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Sprouts Salad' AND category = 'Health & Wellness'), 'Moong sprouts', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Sprouts Salad' AND category = 'Health & Wellness'), 'Cucumber', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Sprouts Salad' AND category = 'Health & Wellness'), 'Tomato', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Sprouts Salad' AND category = 'Health & Wellness'), 'Lemon juice', 20, 'ml', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Sprouts Salad' AND category = 'Health & Wellness'), 'Chaas masala', 5, 'g', 0.05, NULL);

-- Quinoa Upma Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Quinoa Upma' AND category = 'Health & Wellness'), 'Quinoa', 100, 'g', 0.03, NULL),
((SELECT id FROM recipes WHERE name = 'Quinoa Upma' AND category = 'Health & Wellness'), 'Mixed vegetables', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Quinoa Upma' AND category = 'Health & Wellness'), 'Mustard seeds', 5, 'g', 0.05, NULL),
((SELECT id FROM recipes WHERE name = 'Quinoa Upma' AND category = 'Health & Wellness'), 'Curry leaves', 5, 'g', 0.10, NULL),
((SELECT id FROM recipes WHERE name = 'Quinoa Upma' AND category = 'Health & Wellness'), 'Ghee', 20, 'g', 0.02, NULL);

-- Moong Dal Cheela Ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, supplier_id) VALUES
((SELECT id FROM recipes WHERE name = 'Moong Dal Cheela' AND category = 'Health & Wellness'), 'Moong dal', 100, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Moong Dal Cheela' AND category = 'Health & Wellness'), 'Onion', 50, 'g', 0.01, NULL),
((SELECT id FROM recipes WHERE name = 'Moong Dal Cheela' AND category = 'Health & Wellness'), 'Green chilies', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Moong Dal Cheela' AND category = 'Health & Wellness'), 'Ginger', 5, 'g', 0.02, NULL),
((SELECT id FROM recipes WHERE name = 'Moong Dal Cheela' AND category = 'Health & Wellness'), 'Oil for cooking', 20, 'ml', 0.02, NULL);

-- ================================================================================
-- Note: This script provides ingredients for the sample recipes created.
-- For the complete 500+ recipe database, you would need to add ingredients
-- for all remaining recipes following the same pattern.
-- 
-- Each recipe should have 5-10 ingredients with appropriate quantities,
-- units, and cost per unit based on market prices.
-- ================================================================================