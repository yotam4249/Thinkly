import { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import {
  comparePassword,
  hashPassword,
  verifyRefresh,
  signAccess,
  issueTokens,
  rotateRefresh,
  revokeRefresh,
} from "../services/auth.service";
import { hash } from "crypto";
import { ref } from "process";

export class AuthController{
    static async register(req:Request,res:Response){
        try{
            let {username,password} = req.body ?? {};
            if(!username || !password){
                return res.status(400).json({code:"BAD REQUEST",message:"Username or password needed"});
            }
            username = String(username).trim().toLocaleLowerCase();

            const exist = await UserModel.findOne({username:username});
            if(exist){
                return res.status(409).json({code:"USERNAME EXISTS"})
            }

            const hashed = await hashPassword(password);
            const user = await UserModel.create({
                username:username,
                password:hashed
            });
            const tokens = await issueTokens(user);
            return res.status(201).json({
                user: { id: user.id, username: user.username },
                ...tokens,
            });
        }catch(err){
            console.error("register error:", err);
            return res.status(500).json({ code: "SERVER_ERROR" });
        }
    }



    static async login(req:Request,res:Response){
        try{
            let {username,password} = req.body ?? {}
            if(!username || !password){
                return res.status(400).json({code:"BAD REQUEST",message:"Username or password needed"});
            }
            username = String(username).trim().toLocaleLowerCase();
            const user = await UserModel.findOne({username:username});
            if(!user){
                return res.status(401).json({code:"INVALID CREDENTIALS"});
            }
            const hash = hashPassword(password);
            const passwordExist = await comparePassword(password,user.password)
            if(!passwordExist){
                return res.status(401).json({code:"INVALID CREDENTIALS"});
            }
            const tokens = await issueTokens(user);
            return res.status(201).json({ user: { id: user.id, username: user.username }, ...tokens });
        }catch(err){
            console.error("login error:", err);
            return res.status(500).json({ code: "SERVER_ERROR" });
        }
    }


    static async refresh(req:Request,res:Response){
        try{
            const refresh = req.body?.refreshToken;
            if(!refresh) return res.status(401).json({ code: "NO_REFRESH" });

            let payload;
            try{
                payload = verifyRefresh(refresh);
            }catch {
                return res.status(401).json({ code: "REFRESH_INVALID" });
            }

            const user = await UserModel.findById(payload.sub);
            if (!user || !user.refreshTokens.includes(refresh)) {
                return res.status(401).json({ code: "REFRESH_REVOKED" });
            }

            const newRefresh = await rotateRefresh(user.id, refresh);
            const newAccess = signAccess(user);
            return res.json({ accessToken: newAccess, refreshToken: newRefresh });
        }catch (e) {
            console.error("refresh error:", e);
            return res.status(500).json({ code: "SERVER_ERROR" });
        }
    }

    static async logout(req: Request, res: Response) {
        try {
          const refresh = req.body?.refreshToken;
          if (!refresh) return res.status(400).json({ code: "NO_REFRESH" });
    
          let sub: string | null = null;
          try {
            const p = verifyRefresh(refresh);
            sub = p.sub;
          } catch {}
          if (sub) await revokeRefresh(sub, refresh);
    
          return res.json({ ok: true });
        } catch (e) {
          console.error("logout error:", e);
          return res.status(500).json({ code: "SERVER_ERROR" });
        }
    }

    static async me(req: Request, res: Response) {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ code: "UNAUTHORIZED" });
      
        const user = await UserModel.findById(userId).select("_id username");
        if (!user) return res.status(404).json({ code: "NOT_FOUND" });
      
        return res.json({ user: { id: user.id, username: user.username } });
      }
      
}