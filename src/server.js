import getModels from './models';


export default (ctx) => {
  return class RatingModule {

    async init() {
      this.models = getModels(ctx);
      this.config = ctx.config.rating;
    }

    async run() {
      ctx.app.use('/api/module/rating', this.getApi());
    }

    getApi() {
      const api = ctx.asyncRouter();
      const { isAuth } = ctx.middlewares;
      const { Rating } = this.models;
      // api.get('/', async (req) => { // Список лайков для конкретного документа
      //   const params = req.allParams();
      //   return Rating.find({
      //     subjectType: params.subjectType,
      //     subjectId: params.subjectId,
      //   })
      //   .populate('user');
      // });
      //
      api.all('/one', async (req) => { // Список лайков для конкретного документа
        const rating = await Rating.findOne(req.data);
        return Rating.prepare(rating);
      });
      api.all('/list', async (req) => { // Список лайков для конкретного документа
        const ratings = await Rating.find(req.data);
        return Rating.prepare(ratings);
      });
      api.all('/followers', async (req) => { // Список лайков для конкретного документа
        const { User } = ctx.models;
        let { userId } = req.data;
        if (!userId) {
          userId = req.user && req.user._id;
        }
        const ratings = await Rating.find({
          userId,
          subjectType: 'user',
          type: 'follow',
          value: 1,
        });
        const userIds = ratings.map(r => r.subjectId);
        return User.find({ _id: { $in: userIds } });
        // return
        //
        // ratings.map()
        // return Rating.prepare(ratings);
      });
      api.post('/set', isAuth, async (req) => {
        const params = req.allParams();
        params.userId = req.user._id;
        const fields = ['subjectId', 'subjectType', 'type', 'value'];
        fields.forEach((field) => {
          if (params[field] == null) {
            throw ctx
            .errors
            .e400(`param ${field} is not defined`);
          }
        });
        let rating = await Rating.findOne({
          userId: params.userId,
          type: params.type,
          subjectId: params.subjectId,
          subjectType: params.subjectType.toLowerCase(),
        });
        if (rating) {
          rating.value = params.value;
          return rating.save();
        }
        rating = new Rating(params);
        return rating.save();
      });
      // api.put('/:id', isAuth, async (req) => {
      //   const params = req.allParams();
      //   const comment = await Rating
      //   .findById(req.params.id)
      //   .then(ctx.helpers._checkNotFound('Rating'));
      //   Object.assign(comment, params);
      //   return comment.save();
      // });
      // api.delete('/:id', isAuth, async (req) => {
      //   const comment = await Rating
      //   .findById(req.params.id)
      //   .then(ctx.helpers._checkNotFound('Rating'));
      //   return comment.remove();
      // });
      api.delete('/:id', isAuth, async (req) => {
        const { e403 } = ctx.errors;
        const comment = await Rating
          .findById(req.params.id)
          .then(ctx.helpers._checkNotFound('Rating'));
        if (req.user._id != comment.userId) {
          throw e403('Пользователь не может удалить чужой рейтинг');
        }
        return comment.remove();
      });
      return api;
    }
  };
};
