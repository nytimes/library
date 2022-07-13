import { Application } from "@hotwired/stimulus"

// Import controllers here
import ChildrenListController from "./controllers/children_list_controller"
import EditButtonController from "./controllers/edit_button_controller"
import UsefulnessController from './controllers/usefulness_controller'

const application = Application.start()

// Register controllers here
application.register("children-list", ChildrenListController)
application.register('edit-button', EditButtonController)
application.register('usefulness', UsefulnessController)