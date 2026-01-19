# Video Creation Wizard Enhancement - PRD

### 0. AI Video Generation Optimization
**Status:** Completed ✅
**Priority:** High

**Requirements:**
- [x] Integrate Kling 2.6 through fal.ai for cost optimization (7¢/second vs 10¢/second)
- [x] Disable audio generation to save 3¢ per second on video costs
- [x] Add Kling 2.6 option to video model selection UI
- [x] Update default video model to Kling 2.6 for cost savings
- [x] Maintain backward compatibility with existing Kling models

**Technical Implementation:**
- Added @fal-ai/client SDK dependency
- Created new fal.ai service module with audio disabled
- Updated generateKlingVideo function to route Kling 2.6 requests to fal.ai
- Added FAL_API_KEY environment variable requirement
- Updated all UI components to include Kling 2.6 option

### 1. Social Media Posting & Scheduling Feature
**Status:** Database schema exists, UI/API missing
**Priority:** High

**Requirements:**
- [x] Create Social Media step component (`social-step.tsx`)
- [x] Add social media step to wizard configuration
- [x] Create API endpoints for social posting:
  - [x] `POST /api/projects/[projectId]/social/accounts` - Connect social accounts
  - [x] `POST /api/projects/[projectId]/social/post` - Schedule/publish posts
  - [x] `GET /api/projects/[projectId]/social/accounts` - List connected accounts
- [x] Implement OAuth flows for TikTok, Instagram, YouTube
- [x] Add posting UI with scheduling calendar
- [x] Support multiple platforms (TikTok, Instagram Reels, YouTube Shorts, Facebook)
- [x] Handle posting errors and retries

**Database tables ready:**
- `socialAccounts` - Platform connections
- `socialPosts` - Post scheduling and status
- `postScheduleQueue` - Background job processing
