import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    {
      id: 'pos',
      label: 'Point of Sale',
      icon: 'fa fa-shopping-cart',
      section: 'POS Operations'
    },
    {
      id: 'products',
      label: 'Products',
      icon: 'fa fa-list',
      section: 'POS Operations'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'fa fa-users',
      section: 'POS Operations'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'fa fa-chart-bar',
      section: 'Management'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'fa fa-cog',
      section: 'Management'
    }
  ];

  const sections = ['POS Operations', 'Management'];

  return (
    <aside className="sidebar">
      <nav className="nav-menu">
        {sections.map(section => (
          <div key={section} className="menu-section">
            <h3>{section}</h3>
            <ul>
              {menuItems
                .filter(item => item.section === section)
                .map(item => (
                  <li key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}>
                    <a onClick={() => onTabChange(item.id)}>
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
