Cypress.on('uncaught:exception',(err,runnable) =>
{
    return false
})
describe('Search Dashboard', () => {
    it('Search Dashboard',() =>{
        cy.visit('https://www.demoblaze.com/')
        cy.get('#cat').contains('CATEGORIES')
    })
})