# Job Platform Monetization System - Requirements

## Overview
This specification defines the monetization model for the AOW Job Platform, focusing on Phase 0-1 implementation with a simple pay-per-post system for employers while keeping the platform free for job seekers.

## Business Model Summary
- **Target Users**: Employers/Companies posting jobs
- **Revenue Model**: Pay-per-post + Job boost features
- **Free Tier**: First job post free to reduce friction
- **Pricing**: Simple, transparent pricing (99-399 THB range)
- **Payment**: One-time payments, no subscriptions in Phase 0-1

## User Stories

### Epic 1: Free First Job Post
**As an employer**, I want to post my first job for free so that I can try the platform without upfront costs.

#### User Stories:
- **US-1.1**: As a new employer, I want to see a clear indication that my first job post is free
- **US-1.2**: As a new employer, I want to post my first job without entering payment information
- **US-1.3**: As a returning employer, I want to see my remaining free posts (if any)
- **US-1.4**: As an employer, I want to understand when I'll need to pay for additional posts

### Epic 2: Pay-Per-Post System
**As an employer**, I want to pay for individual job posts so that I only pay for what I use.

#### User Stories:
- **US-2.1**: As an employer, I want to see clear pricing before posting a job
- **US-2.2**: As an employer, I want to pay via QR code (PromptPay) for convenience
- **US-2.3**: As an employer, I want to pay via bank transfer for larger amounts
- **US-2.4**: As an employer, I want to receive a receipt/confirmation after payment
- **US-2.5**: As an employer, I want my job to go live immediately after payment confirmation
- **US-2.6**: As an employer, I want to see my payment history

### Epic 3: Job Boost Features
**As an employer**, I want to boost my job posts for better visibility so that I can attract more qualified candidates.

#### User Stories:
- **US-3.1**: As an employer, I want to feature my job at the top of search results
- **US-3.2**: As an employer, I want to highlight my job with special styling
- **US-3.3**: As an employer, I want to extend my job's visibility period
- **US-3.4**: As an employer, I want to see boost options during job posting
- **US-3.5**: As an employer, I want to boost existing jobs
- **US-3.6**: As an employer, I want to see analytics on boosted vs non-boosted jobs

### Epic 4: Admin Payment Management
**As an admin**, I want to manage payments and pricing so that I can ensure smooth platform operations.

#### User Stories:
- **US-4.1**: As an admin, I want to view all payment transactions
- **US-4.2**: As an admin, I want to manually verify payments when needed
- **US-4.3**: As an admin, I want to adjust pricing tiers
- **US-4.4**: As an admin, I want to generate revenue reports
- **US-4.5**: As an admin, I want to handle payment disputes
- **US-4.6**: As an admin, I want to manage promotional codes/discounts

## Functional Requirements

### FR-1: Pricing Structure
- **FR-1.1**: First job post is free for all new employers
- **FR-1.2**: Standard job post: 199 THB
- **FR-1.3**: Premium job post (30-day listing): 299 THB
- **FR-1.4**: Featured job boost: +99 THB
- **FR-1.5**: Urgent job highlight: +149 THB
- **FR-1.6**: Extended visibility (60 days): +199 THB

### FR-2: Payment Processing
- **FR-2.1**: Support PromptPay QR code payments
- **FR-2.2**: Support bank transfer payments
- **FR-2.3**: Generate unique payment references
- **FR-2.4**: Automatic payment verification (where possible)
- **FR-2.5**: Manual payment verification by admin
- **FR-2.6**: Payment timeout handling (24 hours)

### FR-3: Job Post Management
- **FR-3.1**: Jobs remain in "pending payment" status until paid
- **FR-3.2**: Jobs go live immediately after payment confirmation
- **FR-3.3**: Free jobs go live immediately
- **FR-3.4**: Unpaid jobs are automatically deleted after 24 hours
- **FR-3.5**: Paid jobs remain active for specified duration

### FR-4: Boost Features
- **FR-4.1**: Featured jobs appear at top of search results
- **FR-4.2**: Highlighted jobs have special visual styling
- **FR-4.3**: Boosted jobs get priority in email notifications
- **FR-4.4**: Boost effects are clearly visible to job seekers
- **FR-4.5**: Multiple boost options can be combined

### FR-5: Admin Dashboard
- **FR-5.1**: Payment transaction log with filters
- **FR-5.2**: Revenue analytics and reporting
- **FR-5.3**: Payment verification interface
- **FR-5.4**: Pricing management interface
- **FR-5.5**: Refund processing capability

## Non-Functional Requirements

### NFR-1: Performance
- **NFR-1.1**: Payment processing should complete within 30 seconds
- **NFR-1.2**: Job posting should be instant after payment confirmation
- **NFR-1.3**: Payment status checks should be real-time

### NFR-2: Security
- **NFR-2.1**: All payment data must be encrypted
- **NFR-2.2**: Payment references must be unique and non-guessable
- **NFR-2.3**: Admin payment access requires additional authentication
- **NFR-2.4**: Payment logs must be immutable

### NFR-3: Usability
- **NFR-3.1**: Payment process should be completable in under 3 minutes
- **NFR-3.2**: Pricing should be clearly displayed at all times
- **NFR-3.3**: Payment status should be clearly communicated
- **NFR-3.4**: Error messages should be helpful and actionable

### NFR-4: Reliability
- **NFR-4.1**: Payment system should have 99.5% uptime
- **NFR-4.2**: Failed payments should be retryable
- **NFR-4.3**: System should handle payment verification failures gracefully

## Acceptance Criteria

### AC-1: Free First Job Post
- [ ] New employers can post their first job without payment
- [ ] System tracks free post usage per employer
- [ ] Clear messaging about free post benefit
- [ ] Automatic transition to paid posts after free quota

### AC-2: Payment Flow
- [ ] Clear pricing display before job posting
- [ ] Multiple payment method options
- [ ] Unique payment reference generation
- [ ] Payment confirmation handling
- [ ] Job activation after payment

### AC-3: Job Boost System
- [ ] Boost options clearly presented during posting
- [ ] Visual differentiation of boosted jobs
- [ ] Boost effects visible in search results
- [ ] Analytics tracking for boost effectiveness

### AC-4: Admin Management
- [ ] Complete payment transaction visibility
- [ ] Manual payment verification capability
- [ ] Revenue reporting functionality
- [ ] Pricing adjustment interface

## Business Rules

### BR-1: Free Post Allocation
- Each new employer gets exactly 1 free job post
- Free posts cannot be transferred between accounts
- Free posts expire if not used within 90 days of registration
- Free posts cannot be boosted without payment

### BR-2: Payment Validation
- All payments must be verified before job activation
- Payment references are valid for 24 hours only
- Duplicate payments are automatically refunded
- Partial payments are not accepted

### BR-3: Job Visibility
- Unpaid jobs are not visible to job seekers
- Paid jobs remain active for their purchased duration
- Boosted jobs maintain boost effects for the paid period
- Expired jobs are automatically archived

### BR-4: Refund Policy
- Refunds are available within 24 hours of payment
- Jobs with applications cannot be refunded
- Boost features are non-refundable once activated
- Admin can override refund rules for customer service

## Success Metrics

### Revenue Metrics
- Monthly recurring revenue (MRR) from job posts
- Average revenue per employer
- Conversion rate from free to paid posts
- Boost feature adoption rate

### Usage Metrics
- Number of paid job posts per month
- Free post utilization rate
- Payment completion rate
- Time to payment completion

### Quality Metrics
- Payment processing success rate
- Customer satisfaction with payment process
- Support tickets related to payments
- Refund request rate

## Constraints and Assumptions

### Technical Constraints
- Must integrate with existing user authentication system
- Must work with current job posting workflow
- Payment processing must be PCI compliant
- Must support Thai Baht currency only

### Business Constraints
- Phase 0-1 budget limitations
- No subscription billing in initial version
- Manual payment verification acceptable for low volume
- Thai market focus only

### Assumptions
- Employers are willing to pay for quality job posting platform
- PromptPay adoption is sufficient for target market
- Manual payment verification is scalable for initial volume
- Job seekers will remain free users

## Dependencies

### External Dependencies
- PromptPay payment gateway integration
- Bank transfer verification system
- Email notification service for payment confirmations
- SMS service for payment notifications (optional)

### Internal Dependencies
- Existing user management system
- Current job posting workflow
- Admin dashboard framework
- Email service infrastructure

## Risks and Mitigation

### High Risk
- **Payment fraud**: Implement payment verification and monitoring
- **Technical integration failures**: Thorough testing and fallback procedures
- **Low adoption of paid features**: Competitive pricing and clear value proposition

### Medium Risk
- **Manual verification bottlenecks**: Automated verification where possible
- **Currency fluctuation**: Regular pricing reviews
- **Competition from free platforms**: Focus on quality and features

### Low Risk
- **Payment gateway downtime**: Multiple payment options
- **User interface confusion**: User testing and iterative improvements

## Future Considerations (Post Phase 0-1)

### Phase 2 Features
- Subscription plans for high-volume employers
- Advanced analytics and reporting
- Automated payment processing
- International payment methods

### Phase 3 Features
- Job seeker premium features (resume highlighting, etc.)
- Recruitment agency packages
- API access for enterprise customers
- White-label solutions

---

**Document Version**: 1.0  
**Last Updated**: January 6, 2026  
**Status**: Draft  
**Stakeholders**: Product Team, Development Team, Business Team