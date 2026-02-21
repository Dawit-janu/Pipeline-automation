describe('Signup Itera', () => {
//Berhasil Signup Akun
  it('Signup Success', () => {
    cy.visit('https://www.demoblaze.com/')
    cy.get('#signin2')
      .should('be.visible')
      .click()
    cy.get('#signInModal > .modal-dialog > .modal-content > .modal-header')
    cy.get('#sign-username').type('Test')
    cy.get('#sign-password').type('Password123')
    cy.get('.btn.btn-primary')
      .contains('Sign up')
      .click()
    cy.get('#nava')
      .contains('PRODUCT STORE')
  })
})