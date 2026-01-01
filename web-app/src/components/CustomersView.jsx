import React from 'react';

const CustomersView = () => {
  return (
    <div className="customers-view">
      <div className="view-header">
        <h2>Customer Management</h2>
        <div className="view-actions">
          <button className="btn-primary">Add Customer</button>
          <button className="btn-secondary">Import</button>
        </div>
      </div>
      
      <div className="customers-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Total Spent</th>
              <th>Last Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>+91 9876543210</td>
              <td>₹2,500.00</td>
              <td>2024-01-01</td>
              <td>
                <button className="btn-action">View</button>
                <button className="btn-action">Edit</button>
              </td>
            </tr>
            <tr>
              <td>Jane Smith</td>
              <td>jane@example.com</td>
              <td>+91 8765432109</td>
              <td>₹1,800.00</td>
              <td>2023-12-28</td>
              <td>
                <button className="btn-action">View</button>
                <button className="btn-action">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersView;
