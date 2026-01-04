#!/usr/bin/env python3
"""
Garment Product Import Script
Imports sample garment products with variant tracking support
"""

import csv
import json
import requests
import sys
import time
from typing import Dict, List, Any

class GarmentProductImporter:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.imported_count = 0
        self.error_count = 0
        self.errors = []
        
    def load_csv_data(self, csv_file: str) -> List[Dict[str, Any]]:
        """Load and parse CSV data"""
        products = []
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    products.append(row)
            print(f"✓ Loaded {len(products)} products from {csv_file}")
            return products
        except Exception as e:
            print(f"✗ Error loading CSV: {e}")
            return []
    
    def parse_garment_data(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Parse garment-specific data from CSV row"""
        # Parse sizes (comma-separated)
        sizes = [size.strip() for size in row.get('Sizes', '').split(',') if size.strip()]
        
        # Parse colors (comma-separated)
        colors = [color.strip() for color in row.get('Colors', '').split(',') if color.strip()]
        
        # Parse materials (comma-separated)
        materials = [material.strip() for material in row.get('Materials', '').split(',') if material.strip()]
        
        # Parse variant tracking
        variant_tracking_enabled = row.get('Variant Tracking', '').lower() == 'enabled'
        
        return {
            'garment_specific': {
                'has_sizes': len(sizes) > 0,
                'has_colors': len(colors) > 0,
                'has_materials': len(materials) > 0,
                'common_sizes': sizes,
                'common_colors': colors,
                'common_materials': materials,
                'material_composition': materials[0] if materials else 'Cotton',
                'care_instructions': self.get_care_instructions(materials)
            },
            'variant_tracking': {
                'enabled': variant_tracking_enabled,
                'track_sizes': variant_tracking_enabled and len(sizes) > 0,
                'track_colors': variant_tracking_enabled and len(colors) > 0,
                'size_chart': self.get_size_chart(row.get('Garment Category', '')),
                'available_variants': self.generate_variants(sizes, colors)
            },
            'inventory_management': {
                'manage_variants': variant_tracking_enabled,
                'variant_strategy': 'individual_tracking' if variant_tracking_enabled else 'aggregate',
                'low_stock_alerts': True,
                'restock_notifications': True
            }
        }
    
    def get_size_chart(self, category_code: str) -> str:
        """Map category to size chart"""
        size_charts = {
            'MENS_TOPS': 'mens_tops',
            'MENS_BOTTOMS': 'mens_bottoms',
            'MENS_OUTERWEAR': 'mens_outerwear',
            'MENS_UNDERWEAR': 'mens_underwear',
            'WOMENS_TOPS': 'womens_tops',
            'WOMENS_BOTTOMS': 'womens_bottoms',
            'WOMENS_DRESSES': 'womens_dresses',
            'WOMENS_OUTERWEAR': 'womens_outerwear',
            'WOMENS_UNDERWEAR': 'womens_underwear',
            'KIDS_BABY': 'baby_clothing',
            'KIDS_TODDLER': 'toddler_clothing',
            'KIDS_YOUTH': 'youth_clothing',
            'BAGS': 'bags_luggage',
            'JEWELRY': 'jewelry',
            'WATCHES': 'watches',
            'HATS': 'hats_caps',
            'SCARVES': 'scarves',
            'CASUAL_SHOES': 'casual_shoes',
            'DRESS_SHOES': 'dress_shoes',
            'ATHLETIC_SHOES': 'athletic_shoes',
            'BOOTS': 'boots'
        }
        return size_charts.get(category_code, 'standard')
    
    def get_care_instructions(self, materials: List[str]) -> List[str]:
        """Generate care instructions based on materials"""
        instructions = []
        
        if any('cotton' in material.lower() for material in materials):
            instructions.extend(['Machine wash cold', 'Tumble dry low', 'Iron on medium'])
        
        if any('wool' in material.lower() or 'cashmere' in material.lower() for material in materials):
            instructions.extend(['Hand wash cold', 'Dry clean recommended', 'Lay flat to dry'])
        
        if any('silk' in material.lower() for material in materials):
            instructions.extend(['Dry clean only', 'Do not bleach'])
        
        if any('leather' in material.lower() for material in materials):
            instructions.extend(['Wipe clean with damp cloth', 'Condition regularly', 'Store in cool dry place'])
        
        if not instructions:
            instructions = ['Machine wash cold', 'Tumble dry low', 'Do not bleach']
        
        return instructions
    
    def generate_variants(self, sizes: List[str], colors: List[str]) -> List[Dict[str, Any]]:
        """Generate variant combinations"""
        variants = []
        
        if not sizes and not colors:
            return [{'sku_suffix': '', 'size': None, 'color': None, 'stock': 0}]
        
        # Generate size variants if only sizes
        if sizes and not colors:
            for size in sizes:
                variants.append({
                    'sku_suffix': f'-{size}',
                    'size': size,
                    'color': None,
                    'stock': 0
                })
        
        # Generate color variants if only colors
        if colors and not sizes:
            for color in colors:
                variants.append({
                    'sku_suffix': f'-{color.replace(" ", "")}',
                    'size': None,
                    'color': color,
                    'stock': 0
                })
        
        # Generate size + color combinations
        if sizes and colors:
            for size in sizes:
                for color in colors:
                    variants.append({
                        'sku_suffix': f'-{size}-{color.replace(" ", "")}',
                        'size': size,
                        'color': color,
                        'stock': 0
                    })
        
        return variants
    
    def create_product_data(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Create product data for API"""
        # Parse garment-specific fields
        garment_data = self.parse_garment_data(row)
        
        # Calculate quantity distribution across variants
        total_quantity = int(row.get('Quantity', '0') or '0')
        variants = garment_data['variant_tracking']['available_variants']
        
        # Distribute quantity across variants
        if variants and garment_data['variant_tracking']['enabled']:
            base_quantity = total_quantity // len(variants)
            remainder = total_quantity % len(variants)
            
            for i, variant in enumerate(variants):
                variant['stock'] = base_quantity + (1 if i < remainder else 0)
        
        # Create base product data
        product_data = {
            'name': row.get('Product Name', ''),
            'barcode': row.get('Barcode/SKU', '') or None,
            'price': row.get('Price', ''),
            'cost': row.get('Cost Price', '') or row.get('Price', ''),
            'category': row.get('Garment Category', ''),  # Use garment category code
            'quantity': total_quantity,
            'stock': 'Enabled' if row.get('Stock Management', '').lower() == 'enabled' else 'Disabled',
            'minStock': row.get('Minimum Stock', '1'),
            'supplierId': row.get('Supplier ID', '') or None,
            'reorderQuantity': row.get('Reorder Quantity', '0') or '0',
            'img': row.get('Image File', ''),
            
            # Add garment-specific data
            **garment_data
        }
        
        return product_data
    
    def import_product(self, product_data: Dict[str, Any]) -> bool:
        """Import a single product via API"""
        try:
            # Convert product data to form data format
            form_data = {}
            for key, value in product_data.items():
                if key in ['garment_specific', 'variant_tracking', 'inventory_management']:
                    form_data[key] = json.dumps(value)
                elif isinstance(value, bool):
                    form_data[key] = '1' if value else '0'
                else:
                    form_data[key] = str(value) if value is not None else ''
            
            response = requests.post(f"{self.api_url}/inventory/product", data=form_data)
            
            if response.status_code == 200:
                print(f"✓ Imported: {product_data['name']}")
                return True
            else:
                print(f"✗ Failed to import: {product_data['name']} (Status: {response.status_code})")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Error importing {product_data['name']}: {e}")
            return False
    
    def import_products(self, csv_file: str, batch_delay: float = 0.5) -> Dict[str, int]:
        """Import all products from CSV file"""
        print(f"\n=== Starting Garment Product Import ===")
        print(f"CSV File: {csv_file}")
        print(f"API Endpoint: {self.api_url}")
        print(f"Batch Delay: {batch_delay}s")
        
        # Load CSV data
        products = self.load_csv_data(csv_file)
        if not products:
            return {'imported': 0, 'errors': 0}
        
        # Process each product
        for i, row in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] Processing: {row.get('Product Name', 'Unknown')}")
            
            try:
                # Create product data
                product_data = self.create_product_data(row)
                
                # Import product
                if self.import_product(product_data):
                    self.imported_count += 1
                else:
                    self.error_count += 1
                    self.errors.append({
                        'product': row.get('Product Name', 'Unknown'),
                        'error': 'API import failed'
                    })
                
                # Add delay to avoid overwhelming the API
                if i < len(products):
                    time.sleep(batch_delay)
                    
            except Exception as e:
                print(f"✗ Error processing {row.get('Product Name', 'Unknown')}: {e}")
                self.error_count += 1
                self.errors.append({
                    'product': row.get('Product Name', 'Unknown'),
                    'error': str(e)
                })
        
        # Print summary
        print(f"\n=== Import Summary ===")
        print(f"Total products: {len(products)}")
        print(f"Successfully imported: {self.imported_count}")
        print(f"Errors: {self.error_count}")
        
        if self.errors:
            print(f"\nErrors encountered:")
            for error in self.errors:
                print(f"  - {error['product']}: {error['error']}")
        
        return {
            'imported': self.imported_count,
            'errors': self.error_count,
            'total': len(products)
        }
    
    def verify_import(self) -> Dict[str, Any]:
        """Verify imported products"""
        try:
            response = requests.get(f"{self.api_url}/inventory/products")
            if response.status_code == 200:
                products = response.json()
                garment_products = [p for p in products if p.get('garment_specific')]
                
                print(f"\n=== Verification Results ===")
                print(f"Total products in database: {len(products)}")
                print(f"Garment products: {len(garment_products)}")
                
                # Show categories distribution
                categories = {}
                for product in garment_products:
                    category = product.get('category', 'Unknown')
                    categories[category] = categories.get(category, 0) + 1
                
                print(f"\nCategory distribution:")
                for category, count in sorted(categories.items()):
                    print(f"  {category}: {count} products")
                
                return {
                    'total_products': len(products),
                    'garment_products': len(garment_products),
                    'categories': categories
                }
            else:
                print(f"✗ Failed to verify import: {response.status_code}")
                return {}
        except Exception as e:
            print(f"✗ Error during verification: {e}")
            return {}

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python import_garment_products.py <csv_file> [api_url] [batch_delay]")
        print("Example: python import_garment_products.py garment_products_for_import.csv http://localhost:3000 0.5")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    api_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
    batch_delay = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    
    # Create importer and run import
    importer = GarmentProductImporter(api_url)
    results = importer.import_products(csv_file, batch_delay)
    
    # Verify import
    if results['imported'] > 0:
        print(f"\n=== Running Verification ===")
        verification = importer.verify_import()
        
        if verification:
            print(f"\n✓ Import completed successfully!")
            print(f"  - {results['imported']} products imported")
            print(f"  - {verification['garment_products']} garment products in database")
        else:
            print(f"\n⚠ Import completed but verification failed")
    else:
        print(f"\n✗ Import failed - no products were imported")
        sys.exit(1)

if __name__ == "__main__":
    main()