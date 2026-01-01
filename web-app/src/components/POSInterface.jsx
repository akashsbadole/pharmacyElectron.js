import React from 'react';

const POSInterface = ({ 
  products, 
  cartItems, 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  calculateSubtotal, 
  calculateTax, 
  calculateTotal, 
  clearCart, 
  checkout, 
  isLoading 
}) => {
  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const total = calculateTotal();

  return (
    <div className="pos-interface">
      {/* Product Grid */}
      <div className="product-grid">
        {isLoading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="loading">No products available</div>
        ) : (
          products.map(product => (
            <div 
              key={product.id} 
              className="product-card" 
              onClick={() => addToCart(product)}
            >
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="placeholder-image">No Image</div>
                )}
              </div>
              <div className="product-info">
                <h4>{product.name}</h4>
                <span className="product-price">₹{product.price}</span>
                <button className="btn-add-to-cart">Add to Cart</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Sidebar */}
      <aside className="cart-sidebar">
        <div className="cart-header">
          <h3>Shopping Cart</h3>
          <span className="cart-count">{cartItems.length} items</span>
        </div>
        
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <p>Add some products to get started</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-controls">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="quantity-btn"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="cart-item-price">₹{item.price * item.quantity}</div>
                <button 
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Tax ({(calculateTax() / subtotal * 100).toFixed(2)}%):</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="cart-actions">
          <button className="btn-clear" onClick={clearCart} disabled={cartItems.length === 0}>
            Clear Cart
          </button>
          <button className="btn-checkout" onClick={checkout} disabled={cartItems.length === 0}>
            Checkout (₹{total.toFixed(2)})
          </button>
        </div>
      </aside>
      
      <style jsx>{`
        .pos-interface {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 20px;
          height: 100%;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .product-card {
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
          transition: all 0.2s;
          cursor: pointer;
          height: 200px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-color: #4CAF50;
        }

        .product-image {
          height: 120px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          color: #666;
          font-size: 14px;
        }

        .product-info {
          padding: 15px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .product-info h4 {
          font-size: 1rem;
          margin-bottom: 8px;
          font-weight: 500;
          flex: 1;
          line-height: 1.2;
        }

        .product-price {
          font-size: 1.1rem;
          font-weight: bold;
          color: #4CAF50;
          display: block;
          margin-bottom: 10px;
        }

        .btn-add-to-cart {
          width: 100%;
          padding: 10px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          margin-top: auto;
        }

        .btn-add-to-cart:hover {
          background: #45a049;
        }

        /* Cart Sidebar */
        .cart-sidebar {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .cart-header {
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f8f8;
          border-radius: 8px 8px 0 0;
        }

        .cart-header h3 {
          font-size: 1.1rem;
          margin: 0;
        }

        .cart-count {
          font-size: 0.8rem;
          color: #666;
          background: #e0e0e0;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .empty-cart {
          text-align: center;
          color: #666;
          padding: 40px 20px;
        }

        .empty-cart p {
          margin: 10px 0 0 0;
          font-size: 0.9rem;
        }

        .cart-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        }

        .cart-item:hover {
          background-color: #f8f8f8;
        }

        .cart-item:last-child {
          border-bottom: none;
        }

        .cart-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cart-item-name {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f0f0f0;
          border-radius: 20px;
          padding: 4px;
        }

        .quantity-btn {
          background: white;
          border: 1px solid #e0e0e0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          transition: all 0.2s;
        }

        .quantity-btn:hover:not(:disabled) {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }

        .quantity-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-display {
          font-weight: 600;
          min-width: 20px;
          text-align: center;
          font-size: 0.9rem;
        }

        .cart-item-price {
          font-weight: 600;
          color: #4CAF50;
          font-size: 0.9rem;
          min-width: 80px;
          text-align: right;
        }

        .remove-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #666;
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .remove-btn:hover {
          background: #ffebee;
          color: #c62828;
        }

        .cart-summary {
          border-top: 1px solid #e0e0e0;
          padding: 15px;
          background: #f8f8f8;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        .summary-row.total {
          font-weight: bold;
          font-size: 1.1rem;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e0e0e0;
        }

        .cart-actions {
          padding: 15px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 10px;
        }

        .btn-clear, .btn-checkout {
          flex: 1;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .btn-checkout {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }

        .btn-checkout:hover:not(:disabled) {
          background: #45a049;
          border-color: #45a049;
        }

        .btn-checkout:disabled {
          background: #ccc;
          border-color: #ccc;
          cursor: not-allowed;
        }

        .btn-clear:hover:not(:disabled) {
          background: #f0f0f0;
          border-color: #d0d0d0;
        }

        .btn-clear:disabled {
          background: #f5f5f5;
          border-color: #e0e0e0;
          color: #999;
          cursor: not-allowed;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #666;
          font-size: 1rem;
        }

        @media (max-width: 1024px) {
          .pos-interface {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .cart-sidebar {
            order: -1;
            height: auto;
            margin-bottom: 20px;
          }
        }

        @media (max-width: 768px) {
          .pos-interface {
            grid-template-columns: 1fr;
          }
          
          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
          }

          .cart-sidebar {
            position: fixed;
            right: -100%;
            top: 60px;
            height: calc(100vh - 60px);
            transition: right 0.3s;
            z-index: 998;
            width: 100%;
            max-width: 400px;
          }

          .cart-sidebar.active {
            right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default POSInterface;
