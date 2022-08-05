import { Application } from "@hotwired/stimulus"

// Import controllers here
import AttributionController from "./controllers/attribution_controller"
import ChildrenListController from "./controllers/children_list_controller"
import SearchController from "./controllers/search_controller"
import SearchFilterController from "./controllers/search_filter_controller"
import UsefulnessController from './controllers/usefulness_controller'
import UserToolsController from './controllers/user_tools_controller'

const application = Application.start()

// Register controllers here
application.register("attribution", AttributionController)
application.register("children-list", ChildrenListController)
application.register('search', SearchController)
application.register('searchfilter', SearchFilterController)
application.register('usefulness', UsefulnessController)
application.register('user-tools', UserToolsController)
