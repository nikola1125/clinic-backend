import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import { StorageService } from "./common/services/storage.service";
import { AppConfigService } from "./config/config.service";
import * as fs from "fs";
import * as path from "path";

@Controller("files")
export class FilesController {
  constructor(
    private storageService: StorageService,
    private config: AppConfigService,
  ) {}

  @Get(":storageKey(*)")
  async serveFile(
    @Param("storageKey") storageKey: string,
    @Query("expires") expires: string,
    @Query("sig") sig: string,
    @Res() res: Response,
  ) {
    // Verify signature
    const urlPath = `/${storageKey}?expires=${expires}&sig=${sig}`;
    if (!this.storageService.verifySignedUrl(urlPath)) {
      throw new HttpException("Invalid or expired file URL", 403);
    }

    // Only for local storage (S3 URLs go direct to S3)
    const storageRoot = process.env.STORAGE_ROOT || "/app/storage";
    const filePath = path.join(storageRoot, storageKey);

    // Prevent path traversal
    const realPath = path.resolve(filePath);
    const realRoot = path.resolve(storageRoot);
    if (!realPath.startsWith(realRoot)) {
      throw new HttpException("Access denied", 403);
    }

    // Check file exists
    if (!fs.existsSync(realPath) || !fs.statSync(realPath).isFile()) {
      throw new HttpException("File not found", 404);
    }

    // Serve file
    res.sendFile(realPath);
  }
}
