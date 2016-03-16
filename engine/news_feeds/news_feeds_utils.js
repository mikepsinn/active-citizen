var models = require("../../../models");
var _ = require('lodash');

var getCommonWhereDateOptions = function(options) {
  var where = {};
  var dateBefore, dateAfter;

  var dateAtBase = {};

  if (options.beforeFilter && options.afterFilter) {
    dateAtBase[options.dateColumn] = {
      $or: {
        $gt: options.beforeFilter,  //  >  15.01.2001
        $lt: options.afterFilter   //  <  05.01.2001
      }
    };
  } else if (options.beforeFilter) {
    dateAtBase[options.dateColumn] = {
      $gt: options.beforeFilter
    };
  } else if (options.afterFilter) {
    dateAtBase[options.dateColumn] = {
      $lt: options.afterFilter
    };
  } else if (options.beforeOrEqualFilter && options.afterOrEqualFilter) {
    dateAtBase[options.dateColumn] = {
      $or: {
        $gte: options.beforeOrEqualFilter,  //  >  15.01.2001
        $lte: options.afterOrEqualFilter   //  <  05.01.2001
      }
    };
  } else if (options.beforeOrEqualFilter) {
    dateAtBase[options.dateColumn] = {
      $gte: options.beforeOrEqualFilter
    };
  } else if (options.afterOrEqualFilter) {
    dateAtBase[options.dateColumn] = {
      $lte: options.afterOrEqualFilter
    };
  }

  if (!options.dateAfter && !options.dateBefore) {
    _.merge(where, dateAtBase)
  } else if (JSON.stringify(dateAtBase) == JSON.stringify({})) {
    if (options.dateBefore) {
      dateBefore = {};

      before[options.dateColumn] = {
        $lt: options.dateBefore
      };

      _.merge(where, dateBefore);
    } else if (options.dateAfter) {
      dateAfter = {};

      dateAfter[options.dateColumn] = {
        $gt: options.after
      };

      _.merge(where, dateAfter);
    }
  } else {
    if (options.dateBefore) {
      dateBefore = {};

      dateBefore[options.dateColumn] = {
        $lt: options.dateBefore
      };

      _.merge(where, {
        $and: [
          dateBefore,
          dateAtBase
        ]
      });
    } else if (options.dateAfter) {
      dateAfter = {};

      dateAfter[options.dateColumn] = {
        $gt: options.dateAfter
      };

      _.merge(where, {
        $and: [
          dateAfter,
          dateAtBase
        ]
      });
    }
  }

  return where;
};

var getCommonWhereOptions = function(options) {
  var where = {
    status: 'active',
    user_id: options.user_id
  };

  if (options.type) {
    where = _.merge(where, {
      type: options.type
    })
  }

  if (options.domain_id) {
    where = _.merge(where, {
      domain_id: options.domain_id
    })
  }

  if (options.community_id) {
    where = _.merge(where, {
      community_id: options.community_id
    })
  }

  if (options.group_id) {
    where = _.merge(where, {
      group_id: options.group_id
    })
  }

  if (options.post_id) {
    where = _.merge(where, {
      post_id: options.post_id
    })
  }

  return _.merge(where, getCommonWhereDateOptions(options));
};

var getModelDate = function(model, options, callback) {
  var where = getCommonWhereOptions(options);

  if (model == models.AcActivity) {
    delete where.user_id;
    where = _.merge(where, {
      type: {
        $in: defaultKeyActivities
      }
    });
  }

  model.find({
    where: where,
    attributes: [options.dateColumn],
    order: [
      [ options.dateColumn, options.oldest ? 'asc' : 'desc' ]
    ]
  }).then(function (item) {
    if (item) {
      callback(null, item.getDataValue(options.dateColumn));
    } else {
      callback();
    }
  }).catch(function (error) {
    callback(error);
  });
};

var getNewsFeedDate = function(options, type, callback) {
  getModelDate(models.AcNewsFeedItem, _.merge(options, {
    dateColumn: 'latest_activity_at',
    type: type
  }), callback)
};

var getActivityDate = function(options, callback) {
  getModelDate(models.AcActivity, _.merge(options, {
    dateColumn: 'created_at'
  }), callback)
};

var getProcessedRange = function(options, callback) {
  var where = getCommonWhereOptions(options);

  var order;
  if (options.oldest) {
    order = [['latest_activity_at', 'ASC']]
  } else {
    order = [['latest_activity_at', 'DESC']]
  }

  models.AcNewsFeedProcessedRange.find({
    where: where,
    attributes: ['latest_activity_at', 'oldest_activity_at'],
    order: [
      [ 'latest_activity_at', options.oldest ? 'asc' : 'desc' ]
    ]
  }).then(function (item) {
    if (item) {
      callback(null, item);
    } else {
      callback();
    }
  }).catch(function (error) {
    callback(error);
  });
};

var activitiesDefaultIncludes = [
  {
    model: models.User,
    required: true
  },
  {
    model: models.Domain,
    required: true
  },
  {
    model: models.Community,
    required: false
  },
  {
    model: models.Group,
    required: false
  },
  {
    model: models.Post,
    required: false
  },
  {
    model: models.Point,
    required: false
  },
  {
    model: models.PostStatusChange,
    required: false
  }
];

  // Example query 1
  //  Get latest
    // If newer activities than latest_processed_range
      // Load latest notification news feed items with created_at $gt oldest_activity being processed
      // Generate items from activities newer than latest_processed_range_start or Max 30
      // Create processed_range


  // Get more
    // If activities older than last viewed and newer than last_processed_at (older than last viewed also)
      // Generate Items
      // Load latest notification news feed items with created_at $gt oldest_activity being processed
      // Create processed_range
    // Else load all items in the time range next processed range (older than last viewed)
  //  Get new updated
    // If newer activities than latest_processed_range and newer than last viewed
      // Generate items from activities newer than latest_processed_range_start and newer than the last viewed or Max 30
      // Load latest notification news feed items with created_at $gt oldest_activity being processed
      // Create processed_range
  // Else if processed_range newer than last viewed
    // load all items in the time range
  // Else if notification generated items newer than the last viewed
    // Deliver items


  // If I request older items by scrolling down

  //  AcNewsFeed Options
  //    Limit 30
  //  AcActivities
  //    modified_at $gt latest_dynamically_generated_processed_news_feed_ac_activity_modified_at
  //    modified_at $lt oldest_dynamically_generated_processed_news_feed_ac_activity_modified_at

  // Example query 2
  //  Get latest since last
  //  AcNewsFeed Options
  //    modified_at $gt latest_news_feed_item_at
  //  AcActivities
  //    $and
  //      A
  //        modified_at $gt latest_news_feed_item_at
  //      B
  //        modified_at $gt last_dynamically_generated_processed_news_feed_ac_activity_modified_at
  //        modified_at $lt first_dynamically_generated_processed_news_feed_ac_activity_modified_at

  // Example query 3
  // Get older since last shown item
  //  AcNewsFeed Options
  //    modified_at $lt last_shown_news_feed_item_at
  //  AcActivities
  //   $and
  //    A
  //      modified_at $lt last_shown_news_feed_item_at
  //    B
  //      modified_at $gt last_dynamically_generated_processed_news_feed_ac_activity_modified_at
  //      modified_at $lt first_dynamically_generated_processed_news_feed_ac_activity_modified_at

defaultKeyActivities = ['activity.post.status.update','activity.post.officialStatus.successful',
  'activity.point.new','activity.post.new','activity.post.officialStatus.failed',
  'activity.post.officialStatus.inProgress'];

module.exports = {
  activitiesDefaultIncludes: activitiesDefaultIncludes,
  getCommonWhereOptions: getCommonWhereOptions,
  defaultKeyActivities: defaultKeyActivities,
  getActivityDate: getActivityDate,
  getProcessedRange: getProcessedRange
};