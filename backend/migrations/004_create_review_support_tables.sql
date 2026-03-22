-- Migration: Create Review and Support Tables
-- Description: Reviews, Product Questions/Answers, Support Tickets

-- Reviews table
CREATE TABLE reviews (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id, order_id),
  CONSTRAINT fk_reviews_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Product Questions table
CREATE TABLE product_questions (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pq_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pq_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_questions_product_id ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id ON product_questions(user_id);
CREATE INDEX idx_product_questions_is_answered ON product_questions(is_answered);
CREATE INDEX idx_product_questions_created_at ON product_questions(created_at);

-- Product Answers table
CREATE TABLE product_answers (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  answer TEXT NOT NULL,
  is_seller BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_question_id FOREIGN KEY (question_id) REFERENCES product_questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_answers_question_id ON product_answers(question_id);
CREATE INDEX idx_product_answers_user_id ON product_answers(user_id);
CREATE INDEX idx_product_answers_created_at ON product_answers(created_at);

-- Support Tickets table
CREATE TABLE support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('order', 'product', 'payment', 'shipping', 'account', 'other')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to CHAR(36),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_st_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_st_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_order_id ON support_tickets(order_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- Ticket Messages table
CREATE TABLE ticket_messages (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  attachments JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_ticket_id FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_user_id ON ticket_messages(user_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at);
