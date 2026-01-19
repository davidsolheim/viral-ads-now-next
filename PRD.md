# Video Creation Wizard Enhancement - PRD


### 1. Social Media Posting & Scheduling Feature
**Status:** Database schema exists, UI/API missing
**Priority:** High

**Requirements:**
- [ ] Create Social Media step component (`social-step.tsx`)
- [ ] Add social media step to wizard configuration
- [ ] Create API endpoints for social posting:
  - [ ] `POST /api/projects/[projectId]/social/accounts` - Connect social accounts
  - [ ] `POST /api/projects/[projectId]/social/post` - Schedule/publish posts
  - [ ] `GET /api/projects/[projectId]/social/accounts` - List connected accounts
- [ ] Implement OAuth flows for TikTok, Instagram, YouTube
- [ ] Add posting UI with scheduling calendar
- [ ] Support multiple platforms (TikTok, Instagram Reels, YouTube Shorts, Facebook)
- [ ] Handle posting errors and retries

**Database tables ready:**
- `socialAccounts` - Platform connections
- `socialPosts` - Post scheduling and status
- `postScheduleQueue` - Background job processing
