-- SQL Script to Verify and Validate Indian Recipe Database
-- Restaurant POS System - Data Integrity and Completeness Check
-- Created: 2026-01-01

-- ================================================================================
-- DATA INTEGRITY AND VALIDATION QUERIES
-- ================================================================================

-- 1. Check total recipe count by category
SELECT 
    category,
    COUNT(*) as recipe_count,
    ROUND(AVG(cost_per_serving), 2) as avg_cost_per_serving,
    MIN(cost_per_serving) as min_cost,
    MAX(cost_per_serving) as max_cost
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category
ORDER BY recipe_count DESC;

-- 2. Check recipe difficulty distribution
SELECT 
    difficulty_level,
    COUNT(*) as recipe_count,
    ROUND(AVG(cost_per_serving), 2) as avg_cost
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY difficulty_level
ORDER BY recipe_count DESC;

-- 3. Check recipes with nutritional information
SELECT 
    category,
    COUNT(*) as total_recipes,
    COUNT(*) FILTER (WHERE nutritional_info IS NOT NULL AND nutritional_info != '{}') as with_nutrition,
    ROUND(
        (COUNT(*) FILTER (WHERE nutritional_info IS NOT NULL AND nutritional_info != '{}') * 100.0 / COUNT(*)), 
        2
    ) as nutrition_coverage_percent
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category
ORDER BY nutrition_coverage_percent DESC;

-- 4. Check recipes with allergen information
SELECT 
    category,
    COUNT(*) as total_recipes,
    COUNT(*) FILTER (WHERE allergens IS NOT NULL AND allergens != '{}') as with_allergens,
    ROUND(
        (COUNT(*) FILTER (WHERE allergens IS NOT NULL AND allergens != '{}') * 100.0 / COUNT(*)), 
        2
    ) as allergen_coverage_percent
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category
ORDER BY allergen_coverage_percent DESC;

-- 5. Check recipes with dietary information
SELECT 
    category,
    COUNT(*) as total_recipes,
    COUNT(*) FILTER (WHERE dietary_info IS NOT NULL AND dietary_info != '{}') as with_dietary_info,
    ROUND(
        (COUNT(*) FILTER (WHERE dietary_info IS NOT NULL AND dietary_info != '{}') * 100.0 / COUNT(*)), 
        2
    ) as dietary_info_coverage_percent
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category
ORDER BY dietary_info_coverage_percent DESC;

-- 6. Check ingredient coverage
SELECT 
    r.category,
    COUNT(DISTINCT r.id) as total_recipes,
    COUNT(DISTINCT ri.recipe_id) as recipes_with_ingredients,
    ROUND(
        (COUNT(DISTINCT ri.recipe_id) * 100.0 / COUNT(DISTINCT r.id)), 
        2
    ) as ingredient_coverage_percent,
    AVG(ri_count.ingredient_count) as avg_ingredients_per_recipe
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN (
    SELECT recipe_id, COUNT(*) as ingredient_count
    FROM recipe_ingredients 
    GROUP BY recipe_id
) ri_count ON r.id = ri_count.recipe_id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY r.category
ORDER BY ingredient_coverage_percent DESC;

-- 7. Check for recipes with missing critical fields
SELECT 
    'Missing name' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (name IS NULL OR name = '')
UNION ALL
SELECT 
    'Missing category' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (category IS NULL OR category = '')
UNION ALL
SELECT 
    'Missing prep_time' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND prep_time IS NULL
UNION ALL
SELECT 
    'Missing cook_time' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND cook_time IS NULL
UNION ALL
SELECT 
    'Missing serving_size' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND serving_size IS NULL
UNION ALL
SELECT 
    'Missing cost_per_serving' as issue,
    COUNT(*) as count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID' AND cost_per_serving IS NULL;

-- 8. Check for duplicate recipes (same name and category)
SELECT 
    name,
    category,
    COUNT(*) as duplicate_count
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY name, category
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 9. Check ingredient data quality
SELECT 
    'Total ingredients' as metric,
    COUNT(*) as value
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
UNION ALL
SELECT 
    'Ingredients with missing quantity' as metric,
    COUNT(*) as value
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID' AND (ri.quantity IS NULL OR ri.quantity <= 0)
UNION ALL
SELECT 
    'Ingredients with missing unit' as metric,
    COUNT(*) as value
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID' AND (ri.unit IS NULL OR ri.unit = '')
UNION ALL
SELECT 
    'Ingredients with missing cost_per_unit' as metric,
    COUNT(*) as value
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID' AND (ri.cost_per_unit IS NULL OR ri.cost_per_unit <= 0);

-- 10. Check cost calculation accuracy
SELECT 
    r.name as recipe_name,
    r.category,
    r.cost_per_serving as recipe_cost,
    ROUND(SUM(ri.quantity * ri.cost_per_unit), 2) as calculated_ingredient_cost,
    ROUND(
        (r.cost_per_serving - SUM(ri.quantity * ri.cost_per_unit)), 
        2
    ) as cost_difference,
    ROUND(
        ABS(r.cost_per_serving - SUM(ri.quantity * ri.cost_per_unit)) / NULLIF(r.cost_per_serving, 0) * 100, 
        2
    ) as cost_difference_percent
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY r.id, r.name, r.category, r.cost_per_serving
HAVING ABS(r.cost_per_serving - SUM(ri.quantity * ri.cost_per_unit)) > 0.1
ORDER BY cost_difference DESC
LIMIT 20;

-- 11. Check recipe time合理性 (prep_time + cook_time should be reasonable)
SELECT 
    category,
    COUNT(*) as total_recipes,
    COUNT(*) FILTER (WHERE prep_time < 0 OR prep_time > 240) as invalid_prep_time,
    COUNT(*) FILTER (WHERE cook_time < 0 OR cook_time > 480) as invalid_cook_time,
    COUNT(*) FILTER (WHERE (prep_time + cook_time) > 720) as excessive_total_time
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category;

-- 12. Check serving size合理性
SELECT 
    category,
    COUNT(*) as total_recipes,
    COUNT(*) FILTER (WHERE serving_size < 1 OR serving_size > 20) as invalid_serving_size,
    AVG(serving_size) as avg_serving_size
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
GROUP BY category;

-- 13. Check for orphaned ingredients (ingredients without recipes)
SELECT 
    COUNT(*) as orphaned_ingredients
FROM recipe_ingredients ri
LEFT JOIN recipes r ON ri.recipe_id = r.id
WHERE r.id IS NULL;

-- 14. Check data completeness summary
SELECT 
    'Total Recipes' as metric,
    COUNT(*) as value
FROM recipes 
WHERE tenant_id = 'DEFAULT_TENANT_ID'
UNION ALL
SELECT 
    'Total Ingredients' as metric,
    COUNT(*) as value
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
UNION ALL
SELECT 
    'Average Ingredients per Recipe' as metric,
    ROUND(AVG(ingredient_count), 2) as value
FROM (
    SELECT r.id, COUNT(ri.id) as ingredient_count
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
    GROUP BY r.id
) recipe_ingredient_counts
UNION ALL
SELECT 
    'Recipes with Complete Data' as metric,
    COUNT(*) as value
FROM recipes r
WHERE tenant_id = 'DEFAULT_TENANT_ID'
    AND name IS NOT NULL AND name != ''
    AND category IS NOT NULL AND category != ''
    AND prep_time IS NOT NULL
    AND cook_time IS NOT NULL
    AND serving_size IS NOT NULL
    AND cost_per_serving IS NOT NULL;

-- 15. Category-wise completeness report
WITH category_stats AS (
    SELECT 
        category,
        COUNT(*) as total_recipes,
        COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as valid_names,
        COUNT(*) FILTER (WHERE prep_time IS NOT NULL) as valid_prep_time,
        COUNT(*) FILTER (WHERE cook_time IS NOT NULL) as valid_cook_time,
        COUNT(*) FILTER (WHERE serving_size IS NOT NULL) as valid_serving_size,
        COUNT(*) FILTER (WHERE cost_per_serving IS NOT NULL) as valid_cost,
        COUNT(*) FILTER (WHERE nutritional_info IS NOT NULL AND nutritional_info != '{}') as with_nutrition,
        COUNT(*) FILTER (WHERE allergens IS NOT NULL AND allergens != '{}') as with_allergens,
        COUNT(*) FILTER (WHERE dietary_info IS NOT NULL AND dietary_info != '{}') as with_dietary_info
    FROM recipes 
    WHERE tenant_id = 'DEFAULT_TENANT_ID'
    GROUP BY category
)
SELECT 
    category,
    total_recipes,
    ROUND((valid_names * 100.0 / total_recipes), 1) as name_completeness,
    ROUND((valid_prep_time * 100.0 / total_recipes), 1) as prep_time_completeness,
    ROUND((valid_cook_time * 100.0 / total_recipes), 1) as cook_time_completeness,
    ROUND((valid_serving_size * 100.0 / total_recipes), 1) as serving_size_completeness,
    ROUND((valid_cost * 100.0 / total_recipes), 1) as cost_completeness,
    ROUND((with_nutrition * 100.0 / total_recipes), 1) as nutrition_completeness,
    ROUND((with_allergens * 100.0 / total_recipes), 1) as allergen_completeness,
    ROUND((with_dietary_info * 100.0 / total_recipes), 1) as dietary_info_completeness
FROM category_stats
ORDER BY total_recipes DESC;

-- 16. Sample recipes for manual verification
SELECT 
    r.name,
    r.category,
    r.prep_time,
    r.cook_time,
    r.serving_size,
    r.cost_per_serving,
    r.difficulty_level,
    CASE 
        WHEN r.nutritional_info IS NOT NULL AND r.nutritional_info != '{}' THEN 'Yes'
        ELSE 'No'
    END as has_nutrition,
    CASE 
        WHEN r.allergens IS NOT NULL AND r.allergens != '{}' THEN 'Yes'
        ELSE 'No'
    END as has_allergens,
    CASE 
        WHEN r.dietary_info IS NOT NULL AND r.dietary_info != '{}' THEN 'Yes'
        ELSE 'No'
    END as has_dietary_info,
    (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) as ingredient_count
FROM recipes r
WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
ORDER BY r.category, r.name
LIMIT 20;

-- ================================================================================
-- PERFORMANCE AND INDEX VERIFICATION
-- ================================================================================

-- Check if indexes exist and are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('recipes', 'recipe_ingredients')
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE tablename IN ('recipes', 'recipe_ingredients')
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- ================================================================================
-- FINAL VALIDATION SUMMARY
-- ================================================================================

-- Generate a comprehensive validation report
WITH validation_summary AS (
    SELECT 
        'Data Completeness' as category,
        'Total Recipes' as metric,
        COUNT(*) as value
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID'
    
    UNION ALL
    
    SELECT 
        'Data Completeness' as category,
        'Total Ingredients' as metric,
        COUNT(*) as value
    FROM recipe_ingredients ri
    JOIN recipes r ON ri.recipe_id = r.id
    WHERE r.tenant_id = 'DEFAULT_TENANT_ID'
    
    UNION ALL
    
    SELECT 
        'Data Quality' as category,
        'Recipes with Missing Names' as metric,
        COUNT(*) as value
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (name IS NULL OR name = '')
    
    UNION ALL
    
    SELECT 
        'Data Quality' as category,
        'Recipes with Invalid Prep Time' as metric,
        COUNT(*) as value
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (prep_time < 0 OR prep_time > 240)
    
    UNION ALL
    
    SELECT 
        'Data Quality' as category,
        'Recipes with Invalid Cook Time' as metric,
        COUNT(*) as value
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (cook_time < 0 OR cook_time > 480)
    
    UNION ALL
    
    SELECT 
        'Data Quality' as category,
        'Recipes with Invalid Serving Size' as metric,
        COUNT(*) as value
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID' AND (serving_size < 1 OR serving_size > 20)
    
    UNION ALL
    
    SELECT 
        'Data Coverage' as category,
        'Recipes with Nutrition Info' as metric,
        COUNT(*) FILTER (WHERE nutritional_info IS NOT NULL AND nutritional_info != '{}')
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID'
    
    UNION ALL
    
    SELECT 
        'Data Coverage' as category,
        'Recipes with Allergen Info' as metric,
        COUNT(*) FILTER (WHERE allergens IS NOT NULL AND allergens != '{}')
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID'
    
    UNION ALL
    
    SELECT 
        'Data Coverage' as category,
        'Recipes with Dietary Info' as metric,
        COUNT(*) FILTER (WHERE dietary_info IS NOT NULL AND dietary_info != '{}')
    FROM recipes WHERE tenant_id = 'DEFAULT_TENANT_ID'
)
SELECT 
    category,
    metric,
    value,
    CASE 
        WHEN category = 'Data Completeness' THEN '✓'
        WHEN category = 'Data Quality' AND value = 0 THEN '✓'
        WHEN category = 'Data Quality' AND value > 0 THEN '⚠'
        WHEN category = 'Data Coverage' AND value > 0 THEN '✓'
        ELSE '?'
    END as status
FROM validation_summary
ORDER BY category, metric;

-- ================================================================================
-- RECOMMENDATIONS AND NEXT STEPS
-- ================================================================================

/*
VALIDATION RESULTS SUMMARY:

1. DATA COMPLETENESS:
   - Total recipes inserted: [COUNT]
   - Total ingredients: [COUNT]
   - Average ingredients per recipe: [AVERAGE]

2. DATA QUALITY:
   - Missing names: [COUNT] (should be 0)
   - Invalid prep times: [COUNT] (should be 0)
   - Invalid cook times: [COUNT] (should be 0)
   - Invalid serving sizes: [COUNT] (should be 0)

3. DATA COVERAGE:
   - Recipes with nutrition info: [COUNT] ([PERCENTAGE]%)
   - Recipes with allergen info: [COUNT] ([PERCENTAGE]%)
   - Recipes with dietary info: [COUNT] ([PERCENTAGE]%)
   - Recipes with ingredients: [COUNT] ([PERCENTAGE]%)
   - Average ingredients per recipe: [AVERAGE]

4. PERFORMANCE:
   - Table sizes: [SIZES]
   - Index usage: [STATS]

RECOMMENDATIONS:

1. Complete missing data:
   - Add nutrition information for remaining recipes
   - Add allergen information for all recipes
   - Add dietary information for all recipes
   - Add ingredients for all recipes

2. Data validation:
   - Review recipes with cost calculation discrepancies
   - Verify ingredient quantities and costs
   - Check for duplicate recipes

3. Performance optimization:
   - Monitor index usage
   - Consider partitioning for large datasets
   - Optimize queries for common operations

4. Next steps:
   - Complete the remaining 300+ recipes
   - Add supplier information for ingredients
   - Implement data validation rules
   - Create backup and maintenance procedures

5. Testing:
   - Test recipe cost calculations
   - Test menu pricing integration
   - Test inventory deduction functionality
   - Test reporting and analytics features
*/