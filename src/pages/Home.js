import React from 'react';
import '../index.css';

function Home() {
  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-left">
          <h1>Lost@Campus</h1>
          <p className="subheading">Your go-to place when things go missing</p>
        </div>
        <div className="nav-right">
          <button className="nav-btn">Log In</button>
          <button className="nav-btn">Register</button>
          <button className="nav-btn">Submit Lost Item</button>
          <button className="nav-btn">Submit Found Item</button>
          <button className="nav-btn">View Recent Posts</button>
        </div>
      </nav>

      <main className="main-content">
        <section className="search-section">
          <div className="search-container">
            <input type="text" placeholder="Search..." className="search-input" />
            <select className="category-select">
              <option value="">Category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
            </select>
          </div>
        </section>
      </main>

      <div className="content-section">
        <section className="rating">
          <div className="rating-container">
            <p>⭐⭐⭐⭐⭐ Rate us!</p>
          </div>
        </section>

        <section className="recent-items">
          <h2>Some Recent Lost & Found Items</h2>
          <div className="item-grid">
            <div className="item-card">Item 1</div>
            <div className="item-card">Item 2</div>
            <div className="item-card">Item 3</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
