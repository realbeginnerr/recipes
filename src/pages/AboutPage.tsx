import { StorySection, StorySplit } from '../components/StorySection'
import { Button } from '../components/ui/button'
﻿import { Link } from 'react-router-dom'
import { useSearch } from '../context/SearchContext'
import { useLanguage } from '../context/LanguageContext'
import { aboutCopy } from '../i18n/about'
import './AboutPage.css'

export function AboutPage() {
  const { language } = useLanguage()
  const copy = aboutCopy[language]
  const { resetHome } = useSearch()

  return <div className="service-page" lang={language}>
    <section className="story-hero" aria-labelledby="story-title">
      <img src={`${import.meta.env.BASE_URL}images/홈_섹션1_bg_좌우로긴것.png`} alt="" fetchPriority="high" />
      <div className="story-hero-content">
        <h3 id="story-title">{copy.heroFirst && <>{copy.heroFirst}<br /></>}{copy.heroLast}</h3>
        <p className="story-intro">{copy.introFirst}<br />{copy.introLast}</p>
      </div>
    </section>
    <StorySplit id="story-start" titleId="story-background" title={<>{copy.storyTitleFirst}{copy.storyTitleLast && <><br />{copy.storyTitleLast}</>}</>} eyebrow={copy.storyLabel} image={{ src: `${import.meta.env.BASE_URL}images/밥상.png`, alt: copy.tableAlt }}>
      <p>{copy.story}</p><blockquote>{copy.quote}</blockquote>
    </StorySplit>
    <StorySection number="01" titleId="story-meeting" title={copy.meetingTitle}>
      <p>{copy.meeting}</p>
    </StorySection>
    <StorySplit number="02" titleId="story-meal" title={copy.mealTitle} tone="dark" imageSide="right" image={{ src: `${import.meta.env.BASE_URL}images/요리하는라마 (원본).png`, alt: copy.bowlsAlt }}>
      <p>{copy.mealFirst}</p>{'mealLast' in copy && <p>{copy.mealLast}</p>}
    </StorySplit>
    <StorySection number="03" titleId="story-continue" title={copy.continueTitle} tone="soft">
      <p>{copy.continue}</p>
    </StorySection>
    <StorySection number="04" titleId="story-origin" title={copy.originTitle} banner={{ src: `${import.meta.env.BASE_URL}images/요리하는라마.png`, alt: copy.ritualAlt }}>
      <p>{copy.origin}</p>
      <div className="story-action"><Button nativeButton={false} render={<Link to="/recipes" onClick={resetHome} />} size="header" className="reference-request">{copy.browse}</Button></div>
    </StorySection>
  </div>
}
