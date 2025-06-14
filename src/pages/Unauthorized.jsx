import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

const Unauthorized = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow border-danger">
            <Card.Header className="bg-danger text-white">
              <h4 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Access Denied
              </h4>
            </Card.Header>
            <Card.Body className="text-center py-5">
              <i className="fas fa-lock fa-4x mb-3 text-danger"></i>
              <h2 className="mb-3">Unauthorized Access</h2>
              <p className="lead mb-4">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                <Button variant="primary" as={Link} to="/dashboard" className="px-4">
                  <i className="fas fa-home me-2"></i>
                  Go to Dashboard
                </Button>
                <Button variant="outline-secondary" as={Link} to="/" className="px-4">
                  <i className="fas fa-arrow-left me-2"></i>
                  Back to Home
                </Button>
              </div>
            </Card.Body>
            <Card.Footer className="bg-light text-center">
              <small className="text-muted">
                If you need immediate assistance, please contact the system administrator.
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Unauthorized; 