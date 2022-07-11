import { Application } from "@hotwired/stimulus"
import UsefulnessController from './controllers/usefulness_controller'

// Import controllers here
// Example:
import ChildrenListController from "./controllers/children_list_controller"

const application = Application.start()

// Register controllers here
// Example:
application.register("children-list", ChildrenListController)
application.register('usefulness', UsefulnessController)