Cypress.on('uncaught:exception',(err,runnable) =>
{
    return false
})
describe('Login', () => {

//Success Login
    it('Success Login', () => {
        cy.visit('https://itera-qa.azurewebsites.net/')
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
        cy.get('#Username').type('Daw01235')
        cy.get('#Password').type('123456Daw')
        cy.get('.btn-primary').click()
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
    })
//Failed Login
    it('Login Failed',() =>{
        cy.visit('https://itera-qa.azurewebsites.net/')
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
        cy.get('#Username')
        cy.get('#Password')
        cy.get('.btn-primary').click()
        cy.get('.alert-danger')
    })
//Empthy Username
    it('Login Failed Empthy Username',() =>{
        cy.visit('https://itera-qa.azurewebsites.net/')
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
        cy.get('#Username')
        cy.get('#Password').type('123456Daw')
        cy.get('.btn-primary').click()
        cy.get('.alert-danger')
    })
//Empthy Password
    it('Login Failed Empthy Password',() =>{
        cy.visit('https://itera-qa.azurewebsites.net/')
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
        cy.get('#Username').type('Daw01235')
        cy.get('#Password')
        cy.get('.btn-primary').click()
        cy.get('.alert-danger')
    })
})