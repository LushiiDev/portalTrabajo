import * as forumThreadsService from '../services/forumThreadsService.js'

export const getAllThreads = async(req, res, next) => {
    try{
        const resultThreads = await forumThreadsService.getAllThreads();
        res.json(resultThreads)
    } catch (err) {
        return next(err);
    }
};

export const postforumThreads = async (req, res, next) => {
    try{
        const { 
            title,
            content,
            category,
            status
        } = req.body;

        const newThread = await forumThreadsService.postforumThreads(
            title,
            content,
            category,
            status
        );
        res.json(newThread);
    }
    catch (err) {
        return next(err);
    }
};

export const deleteThread = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await forumThreadsService.deleteforumThreads(id);
        res.json(result);
    } catch (err) {
        return next(err);
    }
};

export const putforumThreads = async (req, res, next) => {
  try {
    const{id} = req.params;
    const updates = req.body;
    const result= await forumThreadsService.updateThread(id, updates);
    res.json(result);
  }catch (err) {
    return next(err);
  }
}