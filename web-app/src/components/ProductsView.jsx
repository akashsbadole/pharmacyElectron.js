import React from 'react';

const ProductsView = ({ products, onRefresh }) => {
  return (
    <div className="products-view">
      <div className="view-header">
        <h2>Product Management</h2>
        <div className="view-actions">
          <button className="btn-primary">Add Product</button>
          <button className="btn-secondary" onClick={onRefresh}>Refresh</button>
        </div>
      </div>
      
      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>₹{product.price}</td>
                <td>{product.category_id}</td>
                <td>
                  <span className={`status ${product.available ? 'available' : 'out-of-stock'}`}>
                    {product.available ? 'Available' : 'Out of Stock'}
                  </span>
                </td>
                <td>
                  <button className="btn-action">Edit</button>
                  <button className="btn-action btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsView;
