import * as adminUsersService from "../services/adminUsersService.js";

export const getUsers = async (req, res, next) => {
  try {
    const result = await adminUsersService.getAdminUsers();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const patchUserStatus = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ status: "error", message: "Falta 'status'." });
    }
    const data = await adminUsersService.setUserStatus(table, id, status);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    const deleteAuth = String(req.query.deleteAuth || "") === "1";
    const authUserId = String(req.query.authUserId || "");

    const deletedRow = await adminUsersService.deleteUserRow(table, id);

    let deletedAuth = null;
    if (deleteAuth) {
      const targetAuthId = authUserId || (table === "profiles" ? id : "");
      if (!targetAuthId) {
        return res.status(400).json({
          status: "error",
          message: "Para borrar Auth, envía authUserId o usa table=profiles (id=auth user id).",
        });
      }
      deletedAuth = await adminUsersService.deleteAuthUser(targetAuthId);
    }

    res.json({ deletedRow, deletedAuth });
  } catch (err) {
    next(err);
  }
};

