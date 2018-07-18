// 'use strict'
//
// const request = require('supertest')
// const path = require('path')
// const errorPages = require('../../server/routes/errors')
// const pages = require('../../server/routes/pages')
// const expect = require('chai').expect
//
// // set up
// const testApp = require('express')()
// testApp.set('view engine', 'ejs')
// testApp.set('views', path.join(__dirname, '../../layouts'))
// console.log(path.join(__dirname, '../../layouts'));
// testApp.use(pages)
// testApp.use(errorPages)
// testApp.listen(process.env.TEST_PORT || 3333)
//
// describe.only('Error handling pages', () => {
//   it('should 404 when message is', () => {
//     console.log(errorPages({message: 'Not found'}, {}, {status: () => {render: () => {}}}, {}, {}))
//   });
//
//
//   it('should 404 on an unknown page', () => {
//     request(testApp).get('/not-a-page')
//                     .expect(404)
//   })
//
//   it('should render 404 template', (done) => {
//     request(testApp).get('/not-a-page')
//                     .expect(404)
//                     .end((res, err) => {
//                       console.log(res);
//                       done()
//                     })
//   })
// })
