import { Application } from "@hotwired/stimulus"
import UsefulnessController from './controllers/usefulness_controller'
import SearchFilterController from './controllers/searchfilter_controller'

// Import controllers here
// Example:
// import HelloController from "./controllers/hello_controller"

const application = Application.start()

// Register controllers here
// Example:
// application.register("hello", HelloController)
application.register('usefulness', UsefulnessController)
application.register('searchfilter', SearchFilterController)