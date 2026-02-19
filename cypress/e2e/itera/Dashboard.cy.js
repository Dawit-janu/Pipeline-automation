Cypress.on('uncaught:exception',(err,runnable) =>
{
    return false
})
describe('Search Dashboard', () => {
//Search By Name
    it('Search Dashboard',() =>{
        cy.visit('https://itera-qa.azurewebsites.net/')
        cy.get('.form-inline > .navbar-nav > :nth-child(2) > .nav-link').click()
        cy.get('#Username').type('Daw01235')
        cy.get('#Password').type('123456Daw')
        cy.get('.btn-primary').click()
        cy.get('#searching').type('Tertuliano').wait(10)
        cy.get('.container > div > form > .btn').click()
        cy.get('tbody > :nth-child(2) > :nth-child(1)')
        cy.get(':nth-child(2) > :nth-child(7) > .btn-outline-info').click()
        cy.get('.btn-link').click()
//Search By Email
        cy.get('#searching').type('Deneval_Oliveira@yahoo.com').wait(10)
        cy.get('.container > div > form > .btn').click().wait(10)
        cy.get('#searching').clear()
        cy.get('.container > div > form > .btn').click().wait(10)
    })
})