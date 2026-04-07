import * as forumRepliesService from '../services/forumRepliesService.js'

export const getAllReplies = async(req, res, next) => {
    try{
        const resultReplies = await forumRepliesService.getAllReplies();
        res.json(resultReplies)
    } catch (err) {
        return next(err);
    }
};

export const postforumReplies = async (req, res, next) => {
    try{
        const { 
            content,
            status
        } = req.body;

        const newReply = await forumRepliesService.postforumReplies(
            content,
            status
        );
        res.json(newReply);
    }
    catch (err) {
        return next(err);
    }
};

export const deleteReply = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await forumRepliesService.deleteforumReplies(id);
        res.json(result);
    } catch (err) {
        return next(err);
    }
};

export const putforumReplies = async (req, res, next) => {
  try {
    const{id} = req.params;
    const updates = req.body;
    const result= await forumRepliesService.updateReply(id, updates);
    res.json(result);
  }catch (err) {
    return next(err);
  }
}