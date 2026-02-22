Cypress.on('uncaught:exception',(err,runnable) =>
{
    return false
})
describe('Login', () => {

//Success Login
    it('Success Login', () => {
        cy.visit('https://www.demoblaze.com/')
        cy.get('#login2').click()
        cy.get('#loginusername').type('Test')
        cy.get('#loginpassword').type('Password123')
        cy.get('.btn.btn-primary')
            .contains('Log in')
            .click()
        cy.get('#nava')
            .contains('PRODUCT STORE')
    })
})